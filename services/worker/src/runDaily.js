import { getConfig } from "./config.js";
import { shouldSendAlert, buildTelegramMessage } from "./alertRules.js";
import { sendTelegramMessage } from "./telegram.js";
import { runOperationalInference, exportOperationalAssets } from "./earthEngine.js";
import { fetchFirmsHotspots } from "./firms.js";
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

async function buildAlertEvents({ run, districtRiskDaily, config }) {
  const rules = await readCollection("alertRules");
  const subscribers = await readCollection("subscribers");
  const activeSubscribers = subscribers.filter((subscriber) => subscriber.enabled);
  const alertEvents = [];

  for (const district of districtRiskDaily) {
    const alert = shouldSendAlert(district, rules);
    if (!alert) {
      continue;
    }

    const message = buildTelegramMessage({
      runDate: run.run_date,
      district,
      appUrl: config.publicAppUrl,
      severity: alert.severity,
      triggerReason: alert.trigger_reason
    });

    let scopedSubscribers = activeSubscribers.filter((subscriber) => (
      subscriber.district_scope === "all" || subscriber.district_scope === district.district_id
    ));

    if (scopedSubscribers.length === 0 && config.telegramDefaultChatId) {
      scopedSubscribers = [{
        subscriber_id: "env_default",
        district_scope: "all",
        chat_id: config.telegramDefaultChatId,
        enabled: true
      }];
    }

    let messageStatus = "skipped";
    if (scopedSubscribers.length > 0) {
      const results = await Promise.all(scopedSubscribers.map((subscriber) => (
        sendTelegramMessage({
          botToken: config.telegramBotToken,
          chatId: subscriber.chat_id || config.telegramDefaultChatId,
          message
        })
      )));
      messageStatus = results.every((result) => result.ok) ? "sent" : "partial";
      if (results.every((result) => result.skipped)) {
        messageStatus = "preview";
      }
    }

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
      message_status: messageStatus,
      sent_at: new Date().toISOString(),
      preview_message: message
    });
  }

  return alertEvents;
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

  const districtRiskDaily = inference.districtRiskDaily.map((d) => ({
    ...d,
    hotspot_count_24h: hotspotByDistrict.get(d.district_id) || 0
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

  const alertEvents = await buildAlertEvents({
    run,
    districtRiskDaily,
    config
  });

  const crisisEndedDistricts = districtRiskDaily.filter((d) => {
    const wasAlerted = recentlyAlertedDistrictIds.has(d.district_id);
    const nowSafe = !shouldSendAlert(d, alertRules);
    return wasAlerted && nowSafe;
  });

  for (const district of crisisEndedDistricts) {
    const message =
      `\u2705 All Clear — ${district.district_name}\n` +
      `\ud83d\udcc5 Date: ${run.run_date}\n` +
      `Fire risk has dropped below alert threshold.\n` +
      `Dashboard: ${config.publicAppUrl}`;

    if (config.telegramBotToken && config.telegramDefaultChatId) {
      await sendTelegramMessage({
        botToken: config.telegramBotToken,
        chatId: config.telegramDefaultChatId,
        message
      }).catch((err) => console.error("[crisis-ended] Telegram failed:", err.message));
    }

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

  await replaceLatestRun(run);
  await writeCollection("districtRiskDaily", districtRiskDaily);
  await writeCollection("activeFireDaily", activeFireDaily);
  await writeCollection("alertEvents", alertEvents);

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

