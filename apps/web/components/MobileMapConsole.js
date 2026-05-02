"use client";

import { useState } from "react";
import RiskMapShell from "./RiskMapShell";
import MobileTopBar from "./MobileTopBar";
import MobileMapLayerToggles from "./MobileMapLayerToggles";
import MobileBottomSheet from "./MobileBottomSheet";
import MobileWeatherFloats from "./MobileWeatherFloats";

function colorFromClass(key) {
  switch (key) {
    case "very-low": return "#4575b4";
    case "low": return "#91bfdb";
    case "medium": return "#ffffbf";
    case "high": return "#fdae61";
    case "very-high": return "#d73027";
    case "fire": return "#ff3131";
    default: return "#4575b4";
  }
}

// Rank tile colors: 1st = red, 2nd = orange, 3rd = yellow
const RANK_COLORS = ["#ef4444", "#ff8a3d", "#fbbf24"];

// Map a textual risk class ("Very High") to our color key ("very-high")
function classKey(districtClass) {
  if (!districtClass) return "very-low";
  return String(districtClass).toLowerCase().replace(/\s+/g, "-");
}

function fmtPct(value) {
  const v = Number(value || 0);
  return Math.round(v) + "%";
}

function fmtMaxProb(value) {
  return Math.round(Number(value || 0) * 100) + "%";
}

export default function MobileMapConsole({
  districts = [],
  fires = [],
  messages,
  locale = "en",
  missionState = "monitoring",
  runDate = "-",
  weather = null
}) {
  const [layers, setLayers] = useState({ districts: true, fires: true });

  const top3 = districts.slice(0, 3);
  const lead = top3[0] || null;
  const leadClassKey = classKey(lead?.dominant_risk_class);
  const leadColor = colorFromClass(leadClassKey);
  const severityKey = (lead?.operational_severity || missionState || "monitoring").toLowerCase();
  const peakDisplay = fmtMaxProb(lead?.max_fire_prob);

  const visibleDistricts = layers.districts ? districts : [];
  const visibleFires = layers.fires ? fires : [];

  const peek = (
    <div className="m-live-headline">
      <div className="m-live-district">
        <strong className="m-live-name">{lead?.district_name || "—"}</strong>
        <span className="m-live-sub">
          {lead?.dominant_risk_class || "—"}
          {lead?.hotspot_count_24h > 0 ? ` · ${lead.hotspot_count_24h} hotspot${lead.hotspot_count_24h === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      <div className="m-live-badge" style={{ backgroundColor: leadColor }} data-class={leadClassKey}>
        <span className="m-live-badge-num">{peakDisplay}</span>
        <span className="m-live-badge-label">Max %</span>
      </div>
    </div>
  );

  return (
    <div className="m-live" data-severity={severityKey}>
      <MobileTopBar
        tab="live"
        locale={locale}
        runDate={runDate}
        showScale={true}
        rightSlot={<MobileMapLayerToggles onToggle={setLayers} />}
      />

      <div className="m-live-map">
        <RiskMapShell
          districts={visibleDistricts}
          fires={visibleFires}
          messages={messages?.map || messages}
          locale={locale}
          missionState={missionState}
        />
      </div>

      <MobileBottomSheet peek={peek} above={<MobileWeatherFloats weather={weather} />}>
        <div className="m-sheet-list">
          <h3 className="m-sheet-list-title">Top 3 districts</h3>
          {top3.map((d, i) => {
            const rankColor = RANK_COLORS[i] || RANK_COLORS[2];
            return (
              <div className="m-sheet-item" key={d.district_id || i} data-rank={i + 1}>
                <div className="m-sheet-item-rank" style={{ backgroundColor: rankColor, color: i === 2 ? "#0a0509" : "#fff" }}>
                  {i + 1}
                </div>
                <div className="m-sheet-item-body">
                  <strong className="m-sheet-item-name">{d.district_name}</strong>
                  <span className="m-sheet-item-class">{d.dominant_risk_class || "—"}</span>
                </div>
                <div className="m-sheet-item-prob">
                  <span className="m-sheet-item-prob-num">{fmtMaxProb(d.max_fire_prob)}</span>
                  <span className="m-sheet-item-prob-label">Max %</span>
                </div>
              </div>
            );
          })}
        </div>
      </MobileBottomSheet>
    </div>
  );
}
