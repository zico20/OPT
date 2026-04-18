export async function sendTelegramMessage({ botToken, chatId, message }) {
  if (!botToken || !chatId) {
    return {
      ok: false,
      skipped: true,
      reason: "Missing Telegram credentials"
    };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message
    })
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

