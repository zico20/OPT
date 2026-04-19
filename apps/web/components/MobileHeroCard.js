"use client";

import { useEffect, useState } from "react";

function formatTimeAgo(timestamp) {
  if (!timestamp) return null;
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MobileHeroCard({
  missionState = "monitoring",
  missionTitle,
  criticalCount = 0,
  hotspotCount = 0,
  updatedAt,
  weather,
  tomorrowLabel = "tomorrow"
}) {
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(updatedAt));

  useEffect(() => {
    setTimeAgo(formatTimeAgo(updatedAt));
    const id = setInterval(() => setTimeAgo(formatTimeAgo(updatedAt)), 60000);
    return () => clearInterval(id);
  }, [updatedAt]);

  const modifier = weather?.tomorrow?.risk_modifier;
  let forecastTone = "flat";
  let forecastText = null;
  if (typeof modifier === "number") {
    if (modifier > 1.15) {
      forecastTone = "up";
      forecastText = `↑ Higher risk ${tomorrowLabel}`;
    } else if (modifier < 0.9) {
      forecastTone = "down";
      forecastText = `↓ Lower risk ${tomorrowLabel}`;
    } else {
      forecastTone = "flat";
      forecastText = `→ Similar risk ${tomorrowLabel}`;
    }
  }

  const current = weather?.current;

  return (
    <div className={["mobile-hero-card", "state-" + missionState].join(" ")}>
      <div className="mhc-head">
        <span className="mhc-state-dot" aria-hidden="true" />
        <span className="mhc-state-pill">{missionTitle}</span>
      </div>

      <div className="mhc-main">
        <span className="mhc-big-number">{criticalCount}</span>
        <span className="mhc-big-label">Critical districts</span>
      </div>

      {forecastText && (
        <div className={["mhc-forecast", "mhc-forecast-" + forecastTone].join(" ")}>
          {forecastText}
        </div>
      )}

      <div className="mhc-meta">
        <span className="mhc-meta-item">
          <span className="mhc-meta-dot" />
          {hotspotCount} hotspots
        </span>
        {timeAgo && (
          <span className="mhc-meta-item mhc-meta-muted">
            Updated {timeAgo}
          </span>
        )}
      </div>

      {current && (
        <div className="mhc-weather">
          <div className="mhc-weather-item">
            <span className="mhc-weather-icon">🌡</span>
            <span className="mhc-weather-value">{current.temp_c}°</span>
          </div>
          <div className="mhc-weather-item">
            <span className="mhc-weather-icon">💧</span>
            <span className="mhc-weather-value">{current.humidity_pct}%</span>
          </div>
          <div className="mhc-weather-item">
            <span className="mhc-weather-icon">↑</span>
            <span className="mhc-weather-value">{current.wind_speed_kmh} km/h</span>
          </div>
        </div>
      )}
    </div>
  );
}
