import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import { fetchRegionWeather } from "./weather.js";
import { writeCollection } from "./dataStore.js";
import { sendTelegramMessage } from "./telegram.js";

const FAILURE_STATE_FILE = "weather-failures.json";
const NOTIFY_AFTER_CONSECUTIVE_FAILURES = 2;

async function resolveRuntimeCacheDir() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../..")
  ];
  for (const root of candidates) {
    const mockDir = path.join(root, "data", "mock");
    try {
      await fs.access(mockDir);
      const runtimeDir = path.join(root, "data", "runtime-cache");
      await fs.mkdir(runtimeDir, { recursive: true });
      return runtimeDir;
    } catch {
      continue;
    }
  }
  return null;
}

async function readFailureCount() {
  const dir = await resolveRuntimeCacheDir();
  if (!dir) return 0;
  try {
    const raw = await fs.readFile(path.join(dir, FAILURE_STATE_FILE), "utf8");
    const data = JSON.parse(raw);
    return Number(data?.consecutive ?? 0) || 0;
  } catch {
    return 0;
  }
}

async function writeFailureCount(count) {
  const dir = await resolveRuntimeCacheDir();
  if (!dir) return;
  try {
    await fs.writeFile(
      path.join(dir, FAILURE_STATE_FILE),
      `${JSON.stringify({ consecutive: count, updated_at: new Date().toISOString() }, null, 2)}\n`,
      "utf8"
    );
  } catch {
    // ignore — failure tracking is best-effort
  }
}

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
  await writeFailureCount(0); // reset streak on success

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

      // Track consecutive failures so a single transient blip doesn't page anyone.
      // Hourly runs naturally retry, so one timeout is almost always self-healing.
      let consecutive = 0;
      try {
        const previous = await readFailureCount();
        consecutive = previous + 1;
        await writeFailureCount(consecutive);
      } catch {
        consecutive = NOTIFY_AFTER_CONSECUTIVE_FAILURES; // err on the side of notifying
      }

      if (consecutive < NOTIFY_AFTER_CONSECUTIVE_FAILURES) {
        process.stderr.write(`[weather] Failure ${consecutive}/${NOTIFY_AFTER_CONSECUTIVE_FAILURES} — staying silent until threshold.\n`);
        process.exitCode = 1;
        return;
      }

      try {
        const config = getConfig();
        if (config.telegramBotToken && config.telegramDefaultChatId) {
          const message =
            `⚠️ HazardSignal Weather Refresh FAILED\n` +
            `⏱️ At: ${new Date().toISOString()}\n` +
            `🔁 Consecutive failures: ${consecutive}\n` +
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
