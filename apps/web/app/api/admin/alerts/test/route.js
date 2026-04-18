import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../../lib/adminAuth";
import { getDistrictById, getLatestRun, appendAlertEvent } from "../../../../../lib/data";
import { buildTestAlertMessage } from "../../../../../lib/alerting";
import { getServerEnv } from "../../../../../lib/serverEnv";

export async function POST(request) {
  const guard = await requireAdminApi();
  if (guard) {
    return guard;
  }

  const body = await request.json();
  const districtId = body.districtId || "manavgat";
  const district = await getDistrictById(districtId);
  const latestRun = await getLatestRun();
  const botToken = getServerEnv("TELEGRAM_BOT_TOKEN");
  const chatId = body.chatId || getServerEnv("TELEGRAM_DEFAULT_CHAT_ID");

  if (!district) {
    return NextResponse.json({ error: "District not found" }, { status: 404 });
  }

  const previewMessage = buildTestAlertMessage({
    runDate: latestRun.run_date,
    districtName: district.district_name,
    probability: district.max_fire_prob,
    highRiskPct: district.high_or_very_high_area_pct,
    hotspotCount: district.hotspot_count_24h
  });

  var sendResult = {
    ok: false,
    skipped: true,
    reason: "Missing Telegram credentials"
  };

  if (botToken && chatId) {
    try {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: previewMessage
        })
      });

      const telegramJson = await telegramResponse.json();
      sendResult = {
        ok: telegramResponse.ok && telegramJson.ok,
        skipped: false,
        chat_id: chatId,
        telegram: telegramJson
      };

      if (!telegramResponse.ok || !telegramJson.ok) {
        sendResult.reason = `Telegram API returned ${telegramResponse.status}`;
      }
    } catch (error) {
      sendResult = {
        ok: false,
        skipped: false,
        reason: error instanceof Error ? error.message : "Unknown Telegram error"
      };
    }
  }

  const alertEvent = {
    alert_id: `test_${Date.now()}`,
    run_id: latestRun.run_id,
    district_id: district.district_id,
    district_name: district.district_name,
    severity: "Test",
    trigger_reason: "Manual admin test",
    max_fire_prob: district.max_fire_prob,
    high_or_very_high_area_pct: district.high_or_very_high_area_pct,
    hotspot_count_24h: district.hotspot_count_24h,
    channel: "telegram",
    message_status: sendResult.ok ? "sent" : (sendResult.skipped ? "skipped" : "failed"),
    sent_at: new Date().toISOString(),
    preview_message: previewMessage,
    chat_id: chatId || null,
    send_result: sendResult
  };

  await appendAlertEvent(alertEvent);

  return NextResponse.json({
    ok: sendResult.ok,
    alert: alertEvent
  });
}
