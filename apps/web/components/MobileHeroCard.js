"use client";

import { useEffect, useMemo, useState } from "react";

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

function riskColorForProb(p) {
  if (p >= 0.8) return "#E52211";
  if (p >= 0.6) return "#FF4422";
  if (p >= 0.4) return "#FF7A18";
  if (p >= 0.2) return "#D4A820";
  return "#3FB066";
}

export default function MobileHeroCard({
  missionState = "monitoring",
  missionTitle,
  focusLabel,
  criticalCount = 0,
  hotspotCount = 0,
  peakProbability,
  highRiskArea,
  updatedAt,
  runDate,
  weather,
  districts = [],
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

  const miniBars = useMemo(() => {
    const top = [...districts]
      .sort((a, b) => (b.max_fire_prob ?? 0) - (a.max_fire_prob ?? 0))
      .slice(0, 12);
    return top.map((d) => ({
      id: d.district_id,
      name: d.district_name,
      p: Math.max(0.04, Math.min(1, d.max_fire_prob ?? 0))
    }));
  }, [districts]);

  const peakPct = peakProbability != null ? Math.round(peakProbability * 100) : null;
  const highRiskPct =
    highRiskArea != null
      ? Math.round((highRiskArea <= 1 ? highRiskArea * 100 : highRiskArea) * 10) / 10
      : null;

  return (
    <div className={["mobile-hero-card", "state-" + missionState].join(" ")}>
      <div className="mhc-head">
        <span className="mhc-state-dot" aria-hidden="true" />
        <span className="mhc-state-pill">{missionTitle}</span>
        {focusLabel && (
          <>
            <span className="mhc-head-sep">·</span>
            <span className="mhc-focus">{focusLabel}</span>
          </>
        )}
      </div>

      <div className="mhc-main-row">
        <div className="mhc-main">
          <span className="mhc-big-number">{criticalCount}</span>
          <span className="mhc-big-label">Critical districts</span>
        </div>

        {peakPct != null && (
          <div className="mhc-main mhc-main-secondary">
            <span className="mhc-mid-number">{peakPct}%</span>
            <span className="mhc-big-label">Peak probability</span>
          </div>
        )}
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
        {highRiskPct != null && (
          <span className="mhc-meta-item mhc-meta-muted">
            {highRiskPct}% high-risk area
          </span>
        )}
        {runDate && (
          <span className="mhc-meta-item mhc-meta-muted mhc-meta-mono">
            {runDate}
          </span>
        )}
        {timeAgo && (
          <span className="mhc-meta-item mhc-meta-muted">
            Updated {timeAgo}
          </span>
        )}
      </div>

      {miniBars.length > 0 && (
        <div className="mhc-sparkline-wrap">
          <div className="mhc-sparkline-label">District risk · top {miniBars.length}</div>
          <div className="mhc-sparkline">
            {miniBars.map((b) => (
              <div
                key={b.id}
                className="mhc-spark-bar"
                style={{
                  height: `${Math.round(b.p * 100)}%`,
                  background: riskColorForProb(b.p)
                }}
                title={`${b.name}: ${Math.round(b.p * 100)}%`}
              />
            ))}
          </div>
        </div>
      )}

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
            <span className="mhc-weather-icon">💨</span>
            <span className="mhc-weather-value">
              {current.wind_speed_kmh}
              {current.wind_direction ? ` ${current.wind_direction}` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
