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

export async function fetchRegionWeather({ lat, lon, apiKey }) {
  if (!apiKey) throw new Error("OWM_API_KEY is not set.");

  const base = "https://api.openweathermap.org/data/2.5";
  const params = `lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${base}/weather?${params}`, { signal: AbortSignal.timeout(15_000) }),
    fetch(`${base}/forecast?${params}&cnt=16`, { signal: AbortSignal.timeout(15_000) })
  ]);

  if (!currentRes.ok) throw new Error(`OWM current: ${currentRes.status} ${currentRes.statusText}`);
  if (!forecastRes.ok) throw new Error(`OWM forecast: ${forecastRes.status} ${forecastRes.statusText}`);

  const [curr, fc] = await Promise.all([currentRes.json(), forecastRes.json()]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);

  const tmEntries = (fc.list || []).filter((e) => e.dt_txt?.startsWith(tomorrowDate));
  const tmTemps = tmEntries.map((e) => e.main?.temp_max ?? e.main?.temp ?? 20);
  const tmHumidity = tmEntries.map((e) => e.main?.humidity ?? 50);
  const tmWind = tmEntries.map((e) => e.wind?.speed ?? 0);

  const tmMaxTemp = tmTemps.length ? Math.max(...tmTemps) : 30;
  const tmMinHumidity = tmHumidity.length ? Math.min(...tmHumidity) : 50;
  const tmMaxWind = tmWind.length ? Math.max(...tmWind) : 0;
  const tmDesc = tmEntries[Math.floor(tmEntries.length / 2)]?.weather?.[0]?.description || "";

  const riskModifier = calcRiskModifier({
    tempC: tmMaxTemp,
    humidity: tmMinHumidity,
    windKmh: mpsToKmh(tmMaxWind)
  });

  return {
    fetched_at: new Date().toISOString(),
    run_date: new Date().toISOString().slice(0, 10),
    current: {
      temp_c: Math.round(curr.main?.temp * 10) / 10,
      humidity_pct: curr.main?.humidity ?? null,
      wind_speed_kmh: mpsToKmh(curr.wind?.speed ?? 0),
      wind_direction: degToDir(curr.wind?.deg),
      description: curr.weather?.[0]?.description || "",
      icon: curr.weather?.[0]?.icon || ""
    },
    tomorrow: {
      date: tomorrowDate,
      temp_max_c: Math.round(tmMaxTemp * 10) / 10,
      humidity_min_pct: tmMinHumidity,
      wind_max_kmh: mpsToKmh(tmMaxWind),
      description: tmDesc,
      risk_modifier: riskModifier
    }
  };
}
