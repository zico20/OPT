import { getConfig } from "./config.js";
import { fetchRegionWeather } from "./weather.js";
import { writeCollection } from "./dataStore.js";
import { sendTelegramMessage } from "./telegram.js";

/**
 * Hourly weather refresh.
 *
 * Fetches the current Open-Meteo snapshot for the configured (lat,lon) and
 * writes it to the local weatherData store + runtime-cache mirror. The
 * frontend reads weatherData server-side per request (force-dynamic), so
 * the next page load picks up the fresh values.
 *
 * Does NOT touch GEE, FIRMS, alert events, or districtRiskDaily.
 */
export async function runWeather() {
  const config = getConfig();

  if (!config.owmEnabled) {
    return { skipped: true, reason: "OWM_ENABLED=false" };
  }

  const weatherData = await fetchRegionWeather({
    lat: config.owmLat,
    lon: config.owmLon
  });
  await writeCollection("weatherData", weatherData);

  return {
    fetchedAt: weatherData.fetched_at,
    runDate: weatherData.run_date,
    currentTempC: weatherData.current?.temp_c,
    currentHumidity: weatherData.current?.humidity_pct,
    currentWindKmh: weatherData.current?.wind_speed_kmh,
    tomorrowRiskModifier: weatherData.tomorrow?.risk_modifier
  };
}

if (process.argv[1] && process.argv[1].endsWith("runWeather.js")) {
  runWeather()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch(async (error) => {
      process.stderr.write(`${error.stack}\n`);
      try {
        const config = getConfig();
        if (config.telegramBotToken && config.telegramDefaultChatId) {
          const message =
            `⚠️ HazardSignal Weather Refresh FAILED\n` +
            `⏱️ At: ${new Date().toISOString()}\n` +
            `❌ Error: ${error.message}`;
          await sendTelegramMessage({
            botToken: config.telegramBotToken,
            chatId: config.telegramDefaultChatId,
            message
          });
        }
      } catch (notifyError) {
        process.stderr.write(`[NOTIFY] Failed to send weather failure alert: ${notifyError.message}\n`);
      }
      process.exitCode = 1;
    });
}
