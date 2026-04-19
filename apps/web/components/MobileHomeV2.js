"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ── Risk palette matching Angular tokens ─────────────────────────── */
const RISK = {
  low:      { dot: "#3FB066", fg: "#6FD28A", bg: "#1E2E20", label: "Low",       score: 1 },
  moderate: { dot: "#D4A820", fg: "#E8C766", bg: "#2F2A1A", label: "Moderate",  score: 2 },
  high:     { dot: "#FF7A18", fg: "#FF9B4D", bg: "#3A2518", label: "High",      score: 3 },
  veryHigh: { dot: "#FF4422", fg: "#FF6B3D", bg: "#3C1B14", label: "Very High", score: 4 },
  extreme:  { dot: "#E52211", fg: "#FF4A2E", bg: "#3F1A1A", label: "Extreme",   score: 5 }
};
const LEVELS = ["low", "moderate", "high", "veryHigh", "extreme"];

function pickRiskFromProb(p) {
  if (p == null) return "low";
  if (p < 0.2) return "low";
  if (p < 0.4) return "moderate";
  if (p < 0.6) return "high";
  if (p < 0.8) return "veryHigh";
  return "extreme";
}

function deriveRiskKey(district) {
  if (!district) return "low";
  if (district.operational_severity === "critical") return "extreme";
  if (district.operational_severity === "warning") return "veryHigh";
  return pickRiskFromProb(district.max_fire_prob);
}

function sevColor(severity) {
  if (severity === "critical") return "#E52211";
  if (severity === "warning") return "#FF7A18";
  return "#D4A820";
}

function scoreColor(s) {
  if (s > 0.75) return "#E52211";
  if (s > 0.6) return "#FF7A18";
  return "#D4A820";
}

function formatTimeAgo(ts) {
  if (!ts) return null;
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Primitives ───────────────────────────────────────────────────── */

function RiskGauge({ riskKey = "low", size = 200, thickness = 10 }) {
  const color = RISK[riskKey]?.dot ?? "#FF4422";
  const score = RISK[riskKey]?.score ?? 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const sweep = 0.75;
  const trackDash = `${circ * sweep} ${circ}`;
  const filledLen = circ * sweep * (score / 5);
  const filledDash = `${filledLen} ${circ - filledLen + circ * (1 - sweep)}`;

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={thickness}
        strokeDasharray={trackDash}
        transform={`rotate(135 ${cx} ${cy})`}
        strokeLinecap="round"
      />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={filledDash}
        transform={`rotate(135 ${cx} ${cy})`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 600ms ease, stroke 300ms ease" }}
      />
    </svg>
  );
}

function RiskPips({ riskKey = "low" }) {
  const idx = LEVELS.indexOf(riskKey);
  return (
    <div className="hsv2-pips">
      {LEVELS.map((lv, i) => (
        <div
          key={lv}
          className="hsv2-pip"
          style={{ background: i <= idx ? RISK[lv].dot : undefined }}
        />
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

export default function MobileHomeV2({
  topDistrict,
  weather,
  fires = [],
  districts = [],
  latestRun,
  locale = "en"
}) {
  const [timeAgo, setTimeAgo] = useState(() =>
    formatTimeAgo(latestRun?.finished_at || latestRun?.started_at)
  );

  useEffect(() => {
    const ts = latestRun?.finished_at || latestRun?.started_at;
    setTimeAgo(formatTimeAgo(ts));
    const id = setInterval(() => setTimeAgo(formatTimeAgo(ts)), 60000);
    return () => clearInterval(id);
  }, [latestRun]);

  const riskKey = useMemo(() => deriveRiskKey(topDistrict), [topDistrict]);
  const fwi = Math.round((topDistrict?.max_fire_prob ?? 0) * 100);
  const current = weather?.current;
  const tomorrow = weather?.tomorrow;

  const contributors = useMemo(() => {
    if (!current) return [];
    const dryness = Math.max(0, Math.round(100 - (current.humidity_pct ?? 50)));
    const windScore = Math.min(1, (current.wind_speed_kmh ?? 0) / 50);
    const tempScore = Math.min(1, Math.max(0, ((current.temp_c ?? 20) - 15) / 25));
    const forecastScore = Math.min(1, Math.max(0, ((tomorrow?.risk_modifier ?? 1) - 0.7) / 1.3));
    return [
      { key: "dryness", label: "Dryness",      value: dryness,                       unit: "%",    score: dryness / 100 },
      { key: "wind",    label: "Wind",         value: current.wind_speed_kmh ?? 0,   unit: "km/h", score: windScore },
      { key: "temp",    label: "Temperature",  value: current.temp_c ?? 0,           unit: "°",    score: tempScore },
      { key: "tomorrow",label: "Tomorrow x",   value: (tomorrow?.risk_modifier ?? 1).toFixed(2), unit: "", score: forecastScore }
    ];
  }, [current, tomorrow]);

  const hourly = useMemo(() => {
    const nowHr = new Date().getHours();
    const peak = topDistrict?.max_fire_prob ?? 0.4;
    const mod = tomorrow?.risk_modifier ?? 1;
    return Array.from({ length: 6 }, (_, i) => {
      const hour = (nowHr + i) % 24;
      const timeBoost = Math.sin((hour / 24) * Math.PI) * 0.15;
      const blend = 1 + (mod - 1) * (i / 6);
      const p = Math.min(0.99, Math.max(0.05, (peak + timeBoost) * blend));
      return { h: hour, fwi: Math.round(p * 100), risk: pickRiskFromProb(p) };
    });
  }, [topDistrict, tomorrow]);

  const incidents = useMemo(() => {
    const fireBased = fires.slice(0, 3).map((f, i) => ({
      id: f.fire_id || `fire-${i}`,
      name: f.district_name || "Hotspot",
      severity: "critical",
      sizeHa: f.frp ? Math.round(f.frp) : null,
      distance: null,
      containPct: 0
    }));
    if (fireBased.length >= 3) return fireBased;
    const topDistricts = [...districts]
      .filter((d) => d.district_id !== topDistrict?.district_id)
      .sort((a, b) => (b.max_fire_prob ?? 0) - (a.max_fire_prob ?? 0))
      .slice(0, 3 - fireBased.length)
      .map((d) => ({
        id: d.district_id,
        name: d.district_name,
        severity: d.operational_severity === "critical" ? "critical" :
                  d.operational_severity === "warning" ? "warning" : "info",
        sizeHa: null,
        distance: null,
        containPct: Math.round((d.max_fire_prob ?? 0) * 100)
      }));
    return [...fireBased, ...topDistricts];
  }, [fires, districts, topDistrict]);

  return (
    <div className={["hsv2-screen", "risk-" + riskKey].join(" ")}>
      {/* Header */}
      <div className="hsv2-header">
        <div>
          <div className="hsv2-eyebrow">Your Area</div>
          <div className="hsv2-title">
            <span className="hsv2-pin">📍</span>{" "}
            {topDistrict?.district_name || "Antalya"}
            <span className="hsv2-title-sub"> · Antalya</span>
          </div>
        </div>
        <Link href={`/${locale}/alerts`} className="hsv2-bell" aria-label="Alerts">
          🔔
          <span className="hsv2-bell-dot" />
        </Link>
      </div>

      {/* Hero card */}
      <div className="hsv2-hero">
        <div className="hsv2-eyebrow hsv2-center">Current Risk</div>

        <div className="hsv2-gauge-wrap">
          <RiskGauge riskKey={riskKey} size={200} thickness={10} />
          <div className="hsv2-gauge-label">
            <div className="hsv2-fwi">{fwi}</div>
            <div className="hsv2-fwi-label">FWI</div>
          </div>
        </div>

        <div className="hsv2-risk-label" style={{ color: RISK[riskKey].fg }}>
          {RISK[riskKey].label}
        </div>
        <div className="hsv2-stay-alert">
          {timeAgo ? `Stay alert · updated ${timeAgo}` : "Stay alert"}
        </div>

        <RiskPips riskKey={riskKey} />

        {current && (
          <div className="hsv2-conditions">
            <div className="hsv2-cond">
              <div className="hsv2-cond-icon">🌡</div>
              <div className="hsv2-cond-v">{current.temp_c}°</div>
            </div>
            <div className="hsv2-cond">
              <div className="hsv2-cond-icon">💧</div>
              <div className="hsv2-cond-v">{current.humidity_pct}%</div>
            </div>
            <div className="hsv2-cond">
              <div className="hsv2-cond-icon">💨</div>
              <div className="hsv2-cond-v">{current.wind_speed_kmh}km/h</div>
            </div>
            <div className="hsv2-cond">
              <div className="hsv2-cond-dir">{current.wind_direction || "—"}</div>
              <div className="hsv2-cond-v">dir</div>
            </div>
          </div>
        )}
      </div>

      {/* Contributors */}
      {contributors.length > 0 && (
        <>
          <div className="hsv2-section-head">Contributors</div>
          <div className="hsv2-contribs">
            {contributors.map((c) => (
              <div className="hsv2-row" key={c.key}>
                <div className="hsv2-row-label">{c.label}</div>
                <div className="hsv2-row-value">{c.value}{c.unit}</div>
                <div className="hsv2-row-bar">
                  <div
                    className="hsv2-fill"
                    style={{ width: `${c.score * 100}%`, background: scoreColor(c.score) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Hourly */}
      <div className="hsv2-section-head">Next 6 hours</div>
      <div className="hsv2-hourly">
        {hourly.map((h, i) => (
          <div className="hsv2-h-col" key={i}>
            <div className="hsv2-h-fwi" style={{ color: RISK[h.risk].fg }}>{h.fwi}</div>
            <div
              className="hsv2-h-bar"
              style={{
                height: `${Math.max(6, (h.fwi / 100) * 60)}px`,
                background: `linear-gradient(180deg, ${RISK[h.risk].dot}, ${RISK[h.risk].dot}88)`
              }}
            />
            <div className="hsv2-h-hr">{String(h.h).padStart(2, "0")}</div>
          </div>
        ))}
      </div>

      {/* Incidents */}
      {incidents.length > 0 && (
        <>
          <div className="hsv2-section-head hsv2-with-action">
            <span>Nearby</span>
            <Link href={`/${locale}/map`} className="hsv2-section-action">View Map</Link>
          </div>
          {incidents.map((inc) => (
            <div className="hsv2-incident" key={inc.id}>
              <div
                className="hsv2-inc-icon"
                style={{ background: sevColor(inc.severity) + "22", color: sevColor(inc.severity) }}
              >
                🔥
              </div>
              <div className="hsv2-inc-body">
                <div className="hsv2-inc-name">{inc.name}</div>
                <div className="hsv2-inc-meta">
                  {inc.distance != null && <span>{inc.distance}km · </span>}
                  {inc.sizeHa != null && <span>{inc.sizeHa} ha · </span>}
                  <span>{inc.containPct}% risk</span>
                </div>
              </div>
              <div className="hsv2-inc-bar">
                <div
                  className="hsv2-fill"
                  style={{ width: `${inc.containPct}%`, background: sevColor(inc.severity) }}
                />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
