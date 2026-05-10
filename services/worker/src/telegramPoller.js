/**
 * Telegram long-poller — auto-subscribes anyone who sends /start to the bot.
 *
 * Why this exists: the deployed VPS (Hostinger) silently drops inbound TCP
 * from Telegram's IP ranges, so the /api/telegram/webhook endpoint never
 * receives /start updates (verified with tcpdump — 0 packets received from
 * 149.154.160.0/20 + 91.108.4.0/22 even when actively pressing /start).
 *
 * Long-polling flips the direction: this worker initiates `getUpdates`
 * requests OUT to api.telegram.org (which is unblocked outbound), so we
 * pull updates instead of waiting for them to be pushed.
 *
 * The handler logic mirrors the existing webhook (apps/web/app/api/
 * telegram/webhook/route.js) — same /start/subscribe → upsert flow, same
 * /stop/unsubscribe → disable flow, same reply messages.
 *
 * Run as a systemd service alongside the web app:
 *   sudo systemctl enable --now fire-risk-telegram-poller
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getConfig } from "./config.js";

const config = getConfig();
import { appendRecord } from "./dataStore.js";
import { sendTelegramMessage } from "./telegram.js";

// Where we persist the last processed update_id so a restart doesn't replay
// old messages. Lives next to the worker — same disk, same backups.
const STATE_PATH = resolve(process.cwd(), "data/state/telegram-poller.json");

// getUpdates with this timeout = a single HTTP call hangs up to 30s waiting
// for new messages. Lower = more API churn, higher = slower shutdown on
// SIGTERM. 30s is Telegram's recommended default.
const LONG_POLL_SECONDS = 30;

// Brief pause after a network error before retrying — exponential would be
// nicer but the failure mode here is usually transient (DNS hiccup, VPS
// restart). Capped to keep recovery fast.
const ERROR_BACKOFF_MS = 5000;

function readOffset() {
  try {
    const raw = readFileSync(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Number.isFinite(parsed?.offset) ? parsed.offset : 0;
  } catch {
    return 0;
  }
}

function writeOffset(offset) {
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify({ offset, updated_at: new Date().toISOString() }, null, 2));
  } catch (err) {
    console.error("[telegram-poller] Failed to persist offset:", err.message);
  }
}

function buildSubscriberId(chatId) {
  return `tg_${String(chatId)}_all`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function reply(chatId, text) {
  if (!chatId || !text) return;
  await sendTelegramMessage({
    botToken: config.telegramBotToken,
    chatId,
    message: text
  });
}

async function handleMessage(message) {
  if (!message?.chat?.id) return;
  const chatId = String(message.chat.id);
  const text = String(message.text || "").trim().toLowerCase();
  const subscriberId = buildSubscriberId(chatId);

  if (text.startsWith("/stop") || text.startsWith("/unsubscribe")) {
    await appendRecord("subscribers", {
      subscriber_id: subscriberId,
      channel_type: "telegram",
      chat_id: chatId,
      district_scope: "all",
      enabled: false,
      created_at: new Date().toISOString()
    });
    await reply(chatId, "You have been unsubscribed from HazardSignal alerts. Send /start to subscribe again.");
    console.log(`[telegram-poller] unsubscribed ${subscriberId}`);
    return;
  }

  if (text.startsWith("/start") || text.startsWith("/subscribe")) {
    await appendRecord("subscribers", {
      subscriber_id: subscriberId,
      channel_type: "telegram",
      chat_id: chatId,
      district_scope: "all",
      enabled: true,
      created_at: new Date().toISOString()
    });
    await reply(chatId, "You are now subscribed to HazardSignal alerts for Antalya. Send /stop at any time to unsubscribe.");
    console.log(`[telegram-poller] subscribed ${subscriberId}`);
    return;
  }

  // Anything else: friendly help reminder, no DB write.
  await reply(chatId, "Use /start to subscribe to HazardSignal alerts or /stop to unsubscribe.");
}

async function pollOnce(offset) {
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/getUpdates`
    + `?timeout=${LONG_POLL_SECONDS}`
    + `&offset=${offset}`
    + `&allowed_updates=${encodeURIComponent(JSON.stringify(["message"]))}`;

  // Long-poll: Telegram holds the connection up to LONG_POLL_SECONDS waiting
  // for new updates. Add a small buffer to the abort timeout.
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), (LONG_POLL_SECONDS + 5) * 1000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`getUpdates HTTP ${res.status}`);
    }
    const json = await res.json();
    if (!json.ok) {
      throw new Error(`getUpdates not ok: ${json.description || "unknown"}`);
    }
    return json.result || [];
  } finally {
    clearTimeout(abortTimer);
  }
}

async function main() {
  if (!config.telegramBotToken) {
    console.error("[telegram-poller] TELEGRAM_BOT_TOKEN is not set — exiting.");
    process.exit(1);
  }

  // Make sure no webhook is registered — getUpdates will 409 if one is.
  try {
    await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/deleteWebhook?drop_pending_updates=false`);
    console.log("[telegram-poller] cleared any existing webhook (long-polling mode active)");
  } catch (err) {
    console.warn("[telegram-poller] could not clear webhook (may already be off):", err.message);
  }

  let offset = readOffset();
  console.log(`[telegram-poller] starting at offset ${offset}`);

  let running = true;
  function stop(signal) {
    console.log(`[telegram-poller] received ${signal}, draining…`);
    running = false;
  }
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (running) {
    try {
      const updates = await pollOnce(offset);
      for (const update of updates) {
        if (update.message) {
          try {
            await handleMessage(update.message);
          } catch (err) {
            console.error(`[telegram-poller] handler failed for update ${update.update_id}:`, err.message);
          }
        }
        if (update.update_id >= offset) {
          offset = update.update_id + 1;
          writeOffset(offset);
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        // Normal long-poll timeout — just loop again.
        continue;
      }
      console.error("[telegram-poller] poll error:", err.message);
      await new Promise((r) => setTimeout(r, ERROR_BACKOFF_MS));
    }
  }

  console.log("[telegram-poller] stopped cleanly");
  process.exit(0);
}

main().catch((err) => {
  console.error("[telegram-poller] fatal:", err);
  process.exit(1);
});
