import { getServerEnv } from "./serverEnv";

export function getTelegramBotUsername() {
  return (getServerEnv("TELEGRAM_BOT_USERNAME", "wildfire_risk_bot") || "")
    .replace(/^@/, "")
    .trim();
}

export function getTelegramSubscribeUrl() {
  const username = getTelegramBotUsername();
  return username ? `https://t.me/${username}?start=subscribe` : "";
}
