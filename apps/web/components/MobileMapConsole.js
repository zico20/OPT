"use client";

import MobileLiveMapV3 from "./MobileLiveMapV3";
import MobileTopBar from "./MobileTopBar";
import MobileBottomSheet from "./MobileBottomSheet";
import MobileWeatherFloats from "./MobileWeatherFloats";
import AskAI from "./AskAI";
import { classFromMaxProb } from "../lib/format";
import { localizeRiskClass } from "../lib/i18n";

// Per-locale strings for the Live-tab bottom sheet. Risk class names are
// already localized via lib/i18n's localizeRiskClass; this dict covers the
// other UI bits (header + metric label).
const SHEET_STRINGS = {
  en: { topN: "All districts", maxLabel: "Max %", hotspot: (n) => `· ${n} hotspot${n === 1 ? "" : "s"}` },
  tr: { topN: "Tüm ilçeler", maxLabel: "Maks %", hotspot: (n) => `· ${n} sıcak nokta` }
};

function pickSheetStrings(locale) {
  const k = String(locale || "en").toLowerCase();
  if (k === "tr") return SHEET_STRINGS.tr;
  return SHEET_STRINGS.en;
}

function colorFromClass(key) {
  // Mirrors desktop V3 risk gradient (blue → red).
  switch (key) {
    case "very-low": return "#2563d8";
    case "low": return "#4d9bd6";
    case "medium": return "#b8d96b";
    case "high": return "#f59e0b";
    case "very-high": return "#ef4444";
    case "fire": return "#ef4444";
    default: return "#2563d8";
  }
}

// Rank tile colors, descending intensity: red → orange → amber → light → slate.
const RANK_COLORS = ["#ef4444", "#ff8a3d", "#fbbf24", "#fde68a", "#94a3b8"];

// Ranks with light tile backgrounds need dark text for contrast.
function rankTextColor(index) {
  return index === 2 || index === 3 ? "#0a0a0c" : "#fff";
}

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
  const sheetT = pickSheetStrings(locale);

  // Sort all districts descending by max_fire_prob — the bottom sheet shows
  // the entire leaderboard now (was Top 5 — superseded by user request to
  // expose every district inline rather than via a separate route).
  const ranked = [...districts]
    .sort((a, b) => Number(b.max_fire_prob ?? 0) - Number(a.max_fire_prob ?? 0));
  const lead = ranked[0] || null;
  const leadPeakClass = classFromMaxProb(lead?.max_fire_prob);
  const leadClassKey = classKey(leadPeakClass);
  const leadColor = colorFromClass(leadClassKey);
  const severityKey = (lead?.operational_severity || missionState || "monitoring").toLowerCase();
  const peakDisplay = fmtMaxProb(lead?.max_fire_prob);

  // Match the V3 desktop focus headline: risk class · X.X% high-risk area · N hotspots
  // (each piece separated by a middot via the `.m-live-sub` CSS).
  const homeMsg = messages?.home || {};
  const areaLabel = homeMsg.highArea || "high-risk area";
  const hotspotsLabel = homeMsg.hotspots || "hotspots";
  const peek = (
    <div className="m-live-headline">
      <div className="m-live-district">
        <strong className="m-live-name">{lead?.district_name || "—"}</strong>
        <span className="m-live-sub">
          <span>{lead ? localizeRiskClass(leadPeakClass, locale) : "—"}</span>
          {lead?.high_or_very_high_area_pct != null && (
            <span>{Number(lead.high_or_very_high_area_pct).toFixed(1)}% {areaLabel}</span>
          )}
          {lead?.hotspot_count_24h != null && (
            <span>{lead.hotspot_count_24h} {hotspotsLabel}</span>
          )}
        </span>
      </div>
      <div className="m-live-badge" style={{ backgroundColor: leadColor }} data-class={leadClassKey}>
        <span className="m-live-badge-num">{peakDisplay}</span>
        <span className="m-live-badge-label">{sheetT.maxLabel}</span>
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
      />

      <div className="m-live-map">
        <MobileLiveMapV3
          districts={districts}
          fires={fires}
          locale={locale}
        />
        <AskAI locale={locale} />
      </div>

      <MobileBottomSheet
        peek={peek}
        above={<MobileWeatherFloats weather={weather} />}
        listHeader={(
          <h3 className="m-sheet-list-title">
            {sheetT.topN}
            <span className="m-sheet-list-count">{ranked.length}</span>
          </h3>
        )}
      >
        <div className="m-sheet-list">
          {ranked.map((d, i) => {
            // Top 5 keep the brand-tinted rank tile; rest fall to a neutral
            // dark/light surface so the eye registers them as the long tail.
            const rankColor = i < RANK_COLORS.length ? RANK_COLORS[i] : null;
            return (
              <div className="m-sheet-item" key={d.district_id || i} data-rank={i + 1}>
                <div
                  className="m-sheet-item-rank"
                  style={rankColor ? { backgroundColor: rankColor, color: rankTextColor(i) } : undefined}
                >
                  {i + 1}
                </div>
                <div className="m-sheet-item-body">
                  <strong className="m-sheet-item-name">{d.district_name}</strong>
                  <span className="m-sheet-item-class">{localizeRiskClass(classFromMaxProb(d.max_fire_prob), locale)}</span>
                </div>
                <div className="m-sheet-item-prob">
                  <span className="m-sheet-item-prob-num">{fmtMaxProb(d.max_fire_prob)}</span>
                  <span className="m-sheet-item-prob-label">{sheetT.maxLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </MobileBottomSheet>
    </div>
  );
}
