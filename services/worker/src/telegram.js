export async function sendTelegramMessage({
  botToken,
  chatId,
  message,
  parseMode,
  disableNotification,
  disableWebPagePreview
}) {
  if (!botToken || !chatId) {
    return {
      ok: false,
      skipped: true,
      reason: "Missing Telegram credentials"
    };
  }

  const payload = {
    chat_id: chatId,
    text: message
  };
  if (parseMode) payload.parse_mode = parseMode;
  if (disableNotification) payload.disable_notification = true;
  if (disableWebPagePreview) payload.disable_web_page_preview = true;

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      reason: `Telegram API returned ${response.status}`
    };
  }

  return {
    ok: true,
    skipped: false
  };
}

