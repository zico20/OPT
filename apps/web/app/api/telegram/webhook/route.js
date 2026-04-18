import { NextResponse } from "next/server";
import { disableSubscriberById, upsertSubscriber } from "../../../../lib/data";
import { constantTimeEqual, readJsonBody } from "../../../../lib/security";
import { getServerEnv } from "../../../../lib/serverEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildSubscriberId(chatId) {
  return `tg_${String(chatId)}_all`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function isAuthorizedTelegramWebhook(request) {
  const expectedSecret = getServerEnv("TELEGRAM_WEBHOOK_SECRET", "");
  if (!expectedSecret) {
    return true;
  }

  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token") || "";
  return constantTimeEqual(receivedSecret, expectedSecret);
}

async function replyToTelegram(chatId, text) {
  const botToken = getServerEnv("TELEGRAM_BOT_TOKEN", "");
  if (!botToken || !chatId || !text) {
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });
  } catch (error) {
    return;
  }
}

async function processTelegramCommand({ chatId, text, subscriberId }) {
  if (text.startsWith("/stop") || text.startsWith("/unsubscribe")) {
    await disableSubscriberById(subscriberId);
    await replyToTelegram(
      chatId,
      "You have been unsubscribed from HazardSignal alerts. Send /start to subscribe again."
    );
    return;
  }

  if (text.startsWith("/start") || text.startsWith("/subscribe")) {
    await upsertSubscriber({
      subscriber_id: subscriberId,
      channel_type: "telegram",
      chat_id: chatId,
      district_scope: "all",
      enabled: true,
      created_at: new Date().toISOString()
    });
    await replyToTelegram(
      chatId,
      "You are now subscribed to HazardSignal alerts for Antalya. Send /stop at any time to unsubscribe."
    );
    return;
  }

  await replyToTelegram(
    chatId,
    "Use /start to subscribe to HazardSignal alerts or /stop to unsubscribe."
  );
}

export async function POST(request) {
  if (!isAuthorizedTelegramWebhook(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook" }, { status: 401 });
  }

  const payload = await readJsonBody(request);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const message = payload.message || payload.edited_message || null;

  if (!message?.chat?.id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const chatId = String(message.chat.id);
  const text = String(message.text || "").trim().toLowerCase();
  const subscriberId = buildSubscriberId(chatId);
  const action = text.startsWith("/stop") || text.startsWith("/unsubscribe")
    ? "unsubscribed"
    : text.startsWith("/start") || text.startsWith("/subscribe")
      ? "subscribed"
      : "help";

  void processTelegramCommand({ chatId, text, subscriberId }).catch((error) => {
    console.error("[telegram-webhook] Background command handling failed:", error);
  });

  return NextResponse.json({ ok: true, action, queued: true });
}
