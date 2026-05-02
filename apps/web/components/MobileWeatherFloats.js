"use client";

function windArrow(dir) {
  const map = { N: "↑", NE: "↗", E: "→", SE: "↘", S: "↓", SW: "↙", W: "←", NW: "↖" };
  return map[dir] || "→";
}

function fmtTemp(v) {
  if (v == null) return "—";
  return `${Math.round(Number(v))}°`;
}

function fmtHumidity(v) {
  if (v == null) return "—";
  return `${Math.round(Number(v))}%`;
}

function fmtWind(v) {
  if (v == null) return "—";
  return `${Math.round(Number(v))}`;
}

export default function MobileWeatherFloats({ weather }) {
  const current = weather?.current;
  if (!current) return null;

  return (
    <div className="m-weather-floats" role="group" aria-label="Current weather">
      <div className="m-weather-float" data-kind="temp" style={{ "--m-wf-delay": "0ms" }}>
        <span className="m-weather-float-icon" aria-hidden="true">🌡</span>
        <span className="m-weather-float-value">{fmtTemp(current.temp_c)}</span>
      </div>
      <div className="m-weather-float" data-kind="humidity" style={{ "--m-wf-delay": "60ms" }}>
        <span className="m-weather-float-icon" aria-hidden="true">💧</span>
        <span className="m-weather-float-value">{fmtHumidity(current.humidity_pct)}</span>
      </div>
      <div className="m-weather-float" data-kind="wind" style={{ "--m-wf-delay": "120ms" }}>
        <span className="m-weather-float-icon" aria-hidden="true">{windArrow(current.wind_direction)}</span>
        <span className="m-weather-float-value">
          {fmtWind(current.wind_speed_kmh)}
          <span className="m-weather-float-unit">km/h</span>
        </span>
      </div>
    </div>
  );
}
