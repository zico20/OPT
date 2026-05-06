"use client";

import RiskMapShell from "./RiskMapShell";
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
  en: { topN: "Top 5 districts", maxLabel: "Max %", hotspot: (n) => `· ${n} hotspot${n === 1 ? "" : "s"}` },
  ar: { topN: "أعلى 5 مناطق", maxLabel: "النسبة القصوى", hotspot: (n) => `· ${n} نقطة ساخنة` },
  tr: { topN: "İlk 5 ilçe", maxLabel: "Maks %", hotspot: (n) => `· ${n} sıcak nokta` }
};

function pickSheetStrings(locale) {
  const k = String(locale || "en").toLowerCase();
  if (k === "ar" || k === "tr") return SHEET_STRINGS[k];
  return SHEET_STRINGS.en;
}

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

// Rank tile colors, descending intensity: red → orange → amber → light → slate
const RANK_COLORS = ["#ef4444", "#ff8a3d", "#fbbf24", "#fde68a", "#94a3b8"];

// Ranks with light tile backgrounds need dark text for contrast.
function rankTextColor(index) {
  return index === 2 || index === 3 ? "#0a0509" : "#fff";
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
  weather = null,
  isAuthenticated = false
}) {
  const sheetT = pickSheetStrings(locale);

  // Mobile shows "Max %" as the headline metric, so order Top N by it directly
  // (the desktop leaderboard keeps the operational-priority sort because it
  // has explicit columns for each metric).
  const topN = [...districts]
    .sort((a, b) => Number(b.max_fire_prob ?? 0) - Number(a.max_fire_prob ?? 0))
    .slice(0, 5);
  const lead = topN[0] || null;
  const leadPeakClass = classFromMaxProb(lead?.max_fire_prob);
  const leadClassKey = classKey(leadPeakClass);
  const leadColor = colorFromClass(leadClassKey);
  const severityKey = (lead?.operational_severity || missionState || "monitoring").toLowerCase();
  const peakDisplay = fmtMaxProb(lead?.max_fire_prob);

  const peek = (
    <div className="m-live-headline">
      <div className="m-live-district">
        <strong className="m-live-name">{lead?.district_name || "—"}</strong>
        <span className="m-live-sub">
          {lead ? localizeRiskClass(leadPeakClass, locale) : "—"}
          {lead?.hotspot_count_24h > 0 ? ` ${sheetT.hotspot(lead.hotspot_count_24h)}` : ""}
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
        <RiskMapShell
          districts={districts}
          fires={fires}
          messages={messages?.map || messages}
          locale={locale}
          missionState={missionState}
        />
        <AskAI locale={locale} isAuthenticated={isAuthenticated} />
      </div>

      <MobileBottomSheet peek={peek} above={<MobileWeatherFloats weather={weather} />}>
        <div className="m-sheet-list">
          <h3 className="m-sheet-list-title">{sheetT.topN}</h3>
          {topN.map((d, i) => {
            const rankColor = RANK_COLORS[i] || RANK_COLORS[RANK_COLORS.length - 1];
            return (
              <div className="m-sheet-item" key={d.district_id || i} data-rank={i + 1}>
                <div className="m-sheet-item-rank" style={{ backgroundColor: rankColor, color: rankTextColor(i) }}>
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
