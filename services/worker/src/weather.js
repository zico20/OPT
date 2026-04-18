function mpsToKmh(mps) {
  return Math.round(mps * 3.6 * 10) / 10;
}

function degToDir(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((deg || 0) / 45) % 8];
}

function calcRiskModifier({ tempC, humidity, windKmh }) {
  let modifier = 1.0;

  if (humidity < 15) modifier *= 1.7;
  else if (humidity < 25) modifier *= 1.4;
  else if (humidity < 35) modifier *= 1.2;
  else if (humidity < 45) modifier *= 1.08;
  else if (humidity > 80) modifier *= 0.75;
  else if (humidity > 70) modifier *= 0.85;

  if (windKmh > 50) modifier *= 1.5;
  else if (windKmh > 35) modifier *= 1.3;
  else if (windKmh > 20) modifier *= 1.15;
  else if (windKmh > 12) modifier *= 1.05;

  if (tempC > 40) modifier *= 1.3;
  else if (tempC > 35) modifier *= 1.15;
  else if (tempC > 30) modifier *= 1.07;

  return Math.min(2.0, Math.max(0.5, Math.round(modifier * 100) / 100));
}

export async function fetchRegionWeather({ lat, lon }) {
  // Open-Meteo: free, no API key required
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code` +
    `&daily=temperature_2m_max,relative_humidity_2m_min,wind_speed_10m_max,weather_code` +
    `&timezone=auto&forecast_days=2`;

  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`Open-Meteo: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const curr = data.current || {};
  const daily = data.daily || {};

  const windKmh = curr.wind_speed_10m ?? 0;
  const humidity = curr.relative_humidity_2m ?? 50;
  const temp = curr.temperature_2m ?? 25;

  // tomorrow = index 1 in daily arrays
  const tmTempMax = daily.temperature_2m_max?.[1] ?? temp;
  const tmHumidityMin = daily.relative_humidity_2m_min?.[1] ?? humidity;
  const tmWindMax = daily.wind_speed_10m_max?.[1] ?? windKmh;
  const tomorrowDate = daily.time?.[1] ?? null;

  const riskModifier = calcRiskModifier({
    tempC: tmTempMax,
    humidity: tmHumidityMin,
    windKmh: tmWindMax
  });

  return {
    fetched_at: new Date().toISOString(),
    run_date: new Date().toISOString().slice(0, 10),
    current: {
      temp_c: Math.round(temp * 10) / 10,
      humidity_pct: humidity,
      wind_speed_kmh: Math.round(windKmh * 10) / 10,
      wind_direction: degToDir(curr.wind_direction_10m),
      description: weatherCodeToDesc(curr.weather_code),
      icon: weatherCodeToIcon(curr.weather_code)
    },
    tomorrow: {
      date: tomorrowDate,
      temp_max_c: Math.round(tmTempMax * 10) / 10,
      humidity_min_pct: tmHumidityMin,
      wind_max_kmh: Math.round(tmWindMax * 10) / 10,
      description: weatherCodeToDesc(daily.weather_code?.[1]),
      risk_modifier: riskModifier
    }
  };
}

function weatherCodeToDesc(code) {
  if (code == null) return "";
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 69) return "Drizzle";
  if (code <= 79) return "Rain";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

function weatherCodeToIcon(code) {
  if (code == null) return "";
  if (code === 0) return "01d";
  if (code <= 3) return "02d";
  if (code <= 49) return "50d";
  if (code <= 79) return "10d";
  return "11d";
}
