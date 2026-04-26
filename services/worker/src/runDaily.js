import { getConfig } from "./config.js";
import {
  shouldSendAlert,
  buildTelegramMessage,
  buildDigestMessage,
  buildCriticalMessage,
  hasEscalated
} from "./alertRules.js";
import { sendTelegramMessage } from "./telegram.js";
import { runOperationalInference, exportOperationalAssets } from "./earthEngine.js";
import { fetchFirmsHotspots } from "./firms.js";
import { fetchRegionWeather } from "./weather.js";
import { readCollection, writeCollection, replaceLatestRun } from "./dataStore.js";
import { sendWebPushNotifications } from "./pushNotify.js";

function parseBooleanFlag(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parseArgs(argv) {
  const args = {};
  for (const item of argv.slice(2)) {
    if (item.startsWith("--date=")) {
      args.date = item.slice("--date=".length);
      continue;
    }

    if (item === "--export-first") {
      args.exportFirst = true;
      continue;
    }

    if (item.startsWith("--export-first=")) {
      args.exportFirst = parseBooleanFlag(item.slice("--export-first=".length));
    }
  }
  return args;
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

async function buildAlertEvents({ run, districtRiskDaily, prevSeverityByDistrict, config }) {
  const rules = await readCollection("alertRules");
  const alertEvents = [];

  for (const district of districtRiskDaily) {
    const alert = shouldSendAlert(district, rules);
    if (!alert) {
      continue;
    }

    const previousSeverity = prevSeverityByDistrict.get(district.district_id) || null;
    const escalated = hasEscalated(alert.severity, previousSeverity);

    const previewMessage = buildTelegramMessage({
      runDate: run.run_date,
      district,
      appUrl: config.publicAppUrl,
      severity: alert.severity,
      triggerReason: alert.trigger_reason
    });

    alertEvents.push({
      alert_id: `alert_${run.run_date.replaceAll("-", "")}_${district.district_id}`,
      run_id: run.run_id,
      district_id: district.district_id,
      district_name: district.district_name,
      severity: alert.severity,
      trigger_reason: alert.trigger_reason,
      max_fire_prob: district.max_fire_prob,
      high_or_very_high_area_pct: district.high_or_very_high_area_pct,
      hotspot_count_24h: district.hotspot_count_24h,
      channel: "telegram",
      message_status: escalated ? "pending_send" : "suppressed_no_escalation",
      sent_at: new Date().toISOString(),
      preview_message: previewMessage,
      _district: district,
      _escalated: escalated,
      _previousSeverity: previousSeverity
    });
  }

  return alertEvents;
}

async function deliverTelegramAlerts({ runDate, alertEvents, crisisEndedDistricts, config }) {
  const subscribers = await readCollection("subscribers");
  let recipients = subscribers.filter((s) => s.enabled);

  if (recipients.length === 0 && config.telegramDefaultChatId) {
    recipients = [{
      subscriber_id: "env_default",
      district_scope: "all",
      chat_id: config.telegramDefaultChatId,
      enabled: true
    }];
  }

  const escalatedAlerts = alertEvents.filter((e) => e._escalated);
  const newCriticalAlerts = escalatedAlerts.filter((e) => e.severity === "Critical");
  const clearedEntries = crisisEndedDistricts.map((d) => ({ district: d }));

  if (escalatedAlerts.length === 0 && clearedEntries.length === 0) {
    return;
  }

  if (!config.telegramBotToken || recipients.length === 0) {
    for (const e of escalatedAlerts) e.message_status = "skipped_no_recipients";
    return;
  }

  const send = (chatId, message) => sendTelegramMessage({
    botToken: config.telegramBotToken,
    chatId,
    message,
    parseMode: "HTML",
    disableWebPagePreview: true
  }).catch((err) => ({ ok: false, skipped: false, reason: err.message }));

  const markStatus = (alerts, ok) => {
    for (const a of alerts) {
      if (ok) a.message_status = "sent";
      else if (a.message_status === "pending_send") a.message_status = "partial";
    }
  };

  for (const recipient of recipients) {
    const scope = recipient.district_scope || "all";

    const visibleAlerts = scope === "all"
      ? escalatedAlerts
      : escalatedAlerts.filter((e) => e.district_id === scope);
    const visibleCleared = scope === "all"
      ? clearedEntries
      : clearedEntries.filter((c) => c.district.district_id === scope);
    const visibleCriticals = scope === "all"
      ? newCriticalAlerts
      : newCriticalAlerts.filter((e) => e.district_id === scope);

    if (visibleAlerts.length === 0 && visibleCleared.length === 0) continue;

    const chatId = recipient.chat_id || config.telegramDefaultChatId;
    if (!chatId) continue;

    let allOk = true;

    for (const critical of visibleCriticals) {
      const msg = buildCriticalMessage({
        runDate,
        district: critical._district,
        triggerReason: critical.trigger_reason,
        appUrl: config.publicAppUrl
      });
      const result = await send(chatId, msg);
      if (!result.ok) allOk = false;
    }

    const digest = buildDigestMessage({
      runDate,
      alerts: visibleAlerts.map((e) => ({
        severity: e.severity,
        district: e._district,
        triggerReason: e.trigger_reason
      })),
      cleared: visibleCleared,
      appUrl: config.publicAppUrl
    });
    const digestResult = await send(chatId, digest);
    if (!digestResult.ok) allOk = false;

    markStatus(visibleAlerts, allOk);
  }
}

export async function runDaily({ date, exportFirst } = {}) {
  const config = getConfig();
  const runDate = date || getTodayString();
  const shouldExportFirst = typeof exportFirst === "boolean"
    ? exportFirst
    : config.workerExportBeforeRun;

  let exportSummary = null;
  if (shouldExportFirst) {
    if (config.useMockEarthEngine) {
      throw new Error(
        "Cannot export operational assets while WORKER_USE_MOCK_EE=true. " +
        "Set WORKER_USE_MOCK_EE=false or call run-daily without export-first."
      );
    }
    exportSummary = await exportOperationalAssets({ runDate });
  }

  const inference = await runOperationalInference({
    runDate,
    useMockEarthEngine: config.useMockEarthEngine
  });

  let activeFireDaily = inference.activeFireDaily;

  if (!config.useMockEarthEngine && config.firmsEnabled && config.firmsMapKey) {
    try {
      activeFireDaily = await fetchFirmsHotspots({
        config,
        runDate,
        districts: inference.districtRiskDaily
      });
    } catch (error) {
      console.error("[FIRMS] Hotspot fetch failed, continuing with empty fire list:", error.message);
      activeFireDaily = [];
    }
  }

  const hotspotByDistrict = new Map();
  for (const fire of activeFireDaily) {
    hotspotByDistrict.set(fire.district_id, (hotspotByDistrict.get(fire.district_id) || 0) + 1);
  }

  let weatherData = null;
  if (!config.useMockEarthEngine && config.owmEnabled) {
    try {
      weatherData = await fetchRegionWeather({
        lat: config.owmLat,
        lon: config.owmLon
      });
      await writeCollection("weatherData", weatherData);
    } catch (err) {
      console.error("[weather] Fetch failed:", err.message);
    }
  }

  const forecastModifier = weatherData?.tomorrow?.risk_modifier ?? 1.0;
  const forecastDate = weatherData?.tomorrow?.date ?? null;

  const districtRiskDaily = inference.districtRiskDaily.map((d) => ({
    ...d,
    hotspot_count_24h: hotspotByDistrict.get(d.district_id) || 0,
    forecast_max_fire_prob: forecastDate
      ? Math.round(Math.min(0.99, Number(d.max_fire_prob || 0) * forecastModifier) * 1000) / 1000
      : null,
    forecast_date: forecastDate
  }));

  const alertRules = await readCollection("alertRules");
  const warningProbability = Number(alertRules?.probability_warning_min || 0.7);
  const criticalDistricts = districtRiskDaily.filter(
    (d) => d.hotspot_count_24h > 0 && d.max_fire_prob >= warningProbability
  ).length;
  const activeFireDistricts = districtRiskDaily.filter((d) => d.hotspot_count_24h > 0).length;

  const run = {
    ...inference.run,
    critical_districts: criticalDistricts,
    active_fire_districts: activeFireDistricts
  };

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const previousAlerts = await readCollection("alertEvents");
  const recentlyAlertedDistrictIds = new Set(
    previousAlerts
      .filter((a) => a.sent_at >= fortyEightHoursAgo && ["Warning", "Critical"].includes(a.severity))
      .map((a) => a.district_id)
  );

  const prevSeverityByDistrict = new Map();
  for (const a of previousAlerts) {
    if (!a.sent_at || a.sent_at < fortyEightHoursAgo) continue;
    const existing = prevSeverityByDistrict.get(a.district_id);
    if (!existing || a.sent_at > existing.sent_at) {
      prevSeverityByDistrict.set(a.district_id, { severity: a.severity, sent_at: a.sent_at });
    }
  }
  for (const [k, v] of prevSeverityByDistrict) prevSeverityByDistrict.set(k, v.severity);

  const alertEvents = await buildAlertEvents({
    run,
    districtRiskDaily,
    prevSeverityByDistrict,
    config
  });

  const crisisEndedDistricts = districtRiskDaily.filter((d) => {
    const wasAlerted = recentlyAlertedDistrictIds.has(d.district_id);
    const nowSafe = !shouldSendAlert(d, alertRules);
    return wasAlerted && nowSafe;
  });

  await deliverTelegramAlerts({
    runDate: run.run_date,
    alertEvents,
    crisisEndedDistricts,
    config
  });

  for (const district of crisisEndedDistricts) {
    await sendWebPushNotifications({
      title: `\u2705 All Clear — ${district.district_name}`,
      body: "Fire risk has dropped below the alert threshold.",
      url: `${config.publicAppUrl}/districts/${district.district_id}`
    }).catch((err) => console.error("[crisis-ended] Push failed:", err.message));
  }

  if (alertEvents.length > 0) {
    const topAlert = alertEvents[0];
    await sendWebPushNotifications({
      title: `\ud83d\udd25 Fire Alert — ${topAlert.severity}: ${topAlert.district_name}`,
      body: topAlert.trigger_reason,
      url: `${config.publicAppUrl}/districts/${topAlert.district_id}`
    }).catch((err) => console.error("[push] Alert push failed:", err.message));
  }

  const persistedAlertEvents = alertEvents.map(({ _district, _escalated, _previousSeverity, ...rest }) => rest);

  await replaceLatestRun(run);
  await writeCollection("districtRiskDaily", districtRiskDaily);
  await writeCollection("activeFireDaily", activeFireDaily);
  await writeCollection("alertEvents", persistedAlertEvents);

  return {
    run,
    districtCount: districtRiskDaily.length,
    activeFireCount: activeFireDaily.length,
    alertCount: alertEvents.length,
    crisisEndedCount: crisisEndedDistricts.length,
    exportFirst: shouldExportFirst,
    exportSummary
  };
}

const args = parseArgs(process.argv);

if (process.argv[1] && process.argv[1].endsWith("runDaily.js")) {
  runDaily({
    date: args.date,
    exportFirst: args.exportFirst
  })
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch(async (error) => {
      process.stderr.write(`${error.stack}\n`);

      try {
        const config = getConfig();
        if (config.telegramBotToken && config.telegramDefaultChatId) {
          const runDate = args.date || getTodayString();
          const message =
            `\u26a0\ufe0f HazardSignal Pipeline FAILED\n` +
            `\ud83d\udcc5 Date: ${runDate}\n` +
            `\u274c Error: ${error.message}`;
          await sendTelegramMessage({
            botToken: config.telegramBotToken,
            chatId: config.telegramDefaultChatId,
            message
          });
        }
      } catch (notifyError) {
        process.stderr.write(`[NOTIFY] Failed to send failure alert: ${notifyError.message}\n`);
      }

      process.exitCode = 1;
    });
}

