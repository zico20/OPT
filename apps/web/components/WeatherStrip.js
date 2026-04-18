function windIcon(dir) {
  const map = { N: "↑", NE: "↗", E: "→", SE: "↘", S: "↓", SW: "↙", W: "←", NW: "↖" };
  return map[dir] || "→";
}

function modifierLabel(modifier) {
  if (!modifier || modifier === 1) return null;
  if (modifier > 1.3) return { text: "High risk tomorrow", cls: "weather-risk-up danger" };
  if (modifier > 1.1) return { text: "Elevated risk tomorrow", cls: "weather-risk-up warn" };
  if (modifier < 0.85) return { text: "Lower risk tomorrow", cls: "weather-risk-down" };
  return null;
}

export default function WeatherStrip({ weather }) {
  if (!weather?.current) return null;

  const { current, tomorrow } = weather;
  const forecast = modifierLabel(tomorrow?.risk_modifier);

  return (
    <div className="weather-strip">
      <span className="weather-chip" title="Temperature">
        <span className="weather-chip-icon">🌡</span>
        <span>{current.temp_c != null ? `${current.temp_c}°C` : "-"}</span>
      </span>
      <span className="weather-chip" title="Humidity">
        <span className="weather-chip-icon">💧</span>
        <span>{current.humidity_pct != null ? `${current.humidity_pct}%` : "-"}</span>
      </span>
      <span className="weather-chip" title="Wind">
        <span className="weather-chip-icon">{windIcon(current.wind_direction)}</span>
        <span>{current.wind_speed_kmh} km/h {current.wind_direction}</span>
      </span>
      {forecast && (
        <span className={["weather-chip", forecast.cls].join(" ")}>
          <span className="weather-chip-icon">{forecast.cls.includes("down") ? "↘" : "↗"}</span>
          <span>{forecast.text}</span>
        </span>
      )}
    </div>
  );
}
