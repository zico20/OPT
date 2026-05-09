"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AskAI from "./AskAI";

// Leaflet uses window — load only on the client.
const DesktopLiveMapV3 = dynamic(() => import("./DesktopLiveMapV3"), {
  ssr: false,
  loading: () => <div className="dv3-map-loading">Loading map…</div>
});

function tierOf(p) {
  if (p == null) return "vlow";
  if (p >= 0.85) return "vhigh";
  if (p >= 0.6) return "high";
  if (p >= 0.4) return "med";
  if (p >= 0.2) return "low";
  return "vlow";
}
// Match the 5-tier risk gradient used by the dots / legend so the focus
// badge color always matches the dot color of the same district.
function focusTier(p) {
  if (p == null) return "vlow";
  if (p >= 0.85) return "vhigh";
  if (p >= 0.6) return "high";
  if (p >= 0.4) return "med";
  if (p >= 0.2) return "low";
  return "vlow";
}
// Derive risk-class label from max_fire_prob. Supabase rows sometimes
// have stale or null `dominant_risk_class`; deriving keeps the UI
// consistent with the probability the user actually sees.
function riskClassFromProb(p, locale = "en") {
  const RISK_LABELS = {
    en: { vhigh: "Very High", high: "High", med: "Medium", low: "Low", vlow: "Very Low" },
    tr: { vhigh: "Çok Yüksek", high: "Yüksek", med: "Orta", low: "Düşük", vlow: "Çok Düşük" }
  };
  const set = RISK_LABELS[locale] || RISK_LABELS.en;
  return set[tierOf(p)];
}

const TempIcon = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M14 4a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0V4z" /></svg>);
const DropIcon = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /></svg>);
const WindIcon = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 8h12a3 3 0 1 0-3-3M3 16h15a3 3 0 1 1-3 3M3 12h18" /></svg>);
const ArrowIcon = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
const SearchIcon = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);

const DEFAULT_LEGEND_ROWS = [
  { class: "Very Low",  color: "#2563d8" },
  { class: "Low",       color: "#4d9bd6" },
  { class: "Medium",    color: "#b8d96b" },
  { class: "High",      color: "#f59e0b" },
  { class: "Very High", color: "#ef4444" }
];

// Right-rail copy. Kept inline since these labels are V3-specific and
// not worth adding to the global i18n bundle.
const RAIL_STRINGS = {
  en: {
    search: "Search district…",
    filter: "FILTER",
    chipAll: "All",
    chipCritical: "Critical only",
    chipHigh: "High+",
    layers: "LAYERS",
    layerRisk: "Risk surface",
    layerFires: "Active fires",
    layerWeather: "Weather",
    legend: "RISK LEGEND",
    sources: "Source: NASA FIRMS · Sentinel-2 · ERA5",
    updated: "Updated",
    live: "LIVE",
    highArea: "high-risk area",
    hotspots: "hotspots",
    legendVeryLow: "Very Low",
    legendLow: "Low",
    legendMedium: "Medium",
    legendHigh: "High",
    legendVeryHigh: "Very High"
  },
  tr: {
    search: "İlçe ara…",
    filter: "FİLTRE",
    chipAll: "Tümü",
    chipCritical: "Sadece kritik",
    chipHigh: "Yüksek+",
    layers: "KATMANLAR",
    layerRisk: "Risk yüzeyi",
    layerFires: "Aktif yangınlar",
    layerWeather: "Hava",
    legend: "RİSK LEJANTI",
    sources: "Kaynak: NASA FIRMS · Sentinel-2 · ERA5",
    updated: "Güncellendi",
    live: "CANLI",
    highArea: "yüksek risk alanı",
    hotspots: "sıcak nokta",
    legendVeryLow: "Çok Düşük",
    legendLow: "Düşük",
    legendMedium: "Orta",
    legendHigh: "Yüksek",
    legendVeryHigh: "Çok Yüksek"
  }
};
function pickRailStrings(locale) {
  return RAIL_STRINGS[locale] || RAIL_STRINGS.en;
}

export default function DesktopHomeV3({
  locale = "en",
  messages,
  districts = [],
  fires = [],
  alerts = [],
  weather,
  runDate = "-",
  legend = []
}) {
  const sorted = useMemo(
    () => [...districts].sort((a, b) => (b.max_fire_prob ?? 0) - (a.max_fire_prob ?? 0)),
    [districts]
  );
  // Focus defaults to the highest-risk district so the focus sheet is always
  // visible. Clicking a different dot updates focus; clicking empty map area
  // (handled inside DesktopLiveMapV3) resets to null, which we coalesce back
  // to the top district below — never letting the sheet disappear.
  const [focusId, setFocusId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [layers, setLayers] = useState({ risk: true, fires: true, weather: true });

  const visibleDistricts = useMemo(() => {
    let arr = sorted;
    if (filter === "critical") arr = arr.filter((d) => (d.max_fire_prob ?? 0) >= 0.7);
    if (filter === "high")     arr = arr.filter((d) => (d.max_fire_prob ?? 0) >= 0.6);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((d) => (d.district_name || "").toLowerCase().includes(q));
    }
    return arr;
  }, [sorted, filter, search]);

  const focus =
    (focusId && visibleDistricts.find((d) => d.district_id === focusId)) ||
    visibleDistricts[0] ||
    null;

  const weatherTemp = weather?.current?.temp_c;
  const weatherHum = weather?.current?.humidity_pct;
  const weatherWind = weather?.current?.wind_speed_kmh;
  const weatherDir = weather?.current?.wind_direction || "";

  const t = messages?.home || {};
  const r = pickRailStrings(locale);
  // Legend rows: localize the class name; keep the color from the live
  // mapConfig.legend if present, otherwise our default palette.
  const baseLegend = legend.length ? legend : DEFAULT_LEGEND_ROWS;
  const LEGEND_KEYS = ["legendVeryLow", "legendLow", "legendMedium", "legendHigh", "legendVeryHigh"];
  const legendRows = baseLegend.slice(0, 5).map((l, i) => ({
    class: r[LEGEND_KEYS[i]] || l.class,
    color: l.color
  }));

  return (
    <div className="dv3-home-grid">
      {/* HERO MAP — real Leaflet with CARTO dark tiles */}
      <div className="dv3-hero-card">
        <div className="dv3-map-canvas">
          <DesktopLiveMapV3
            districts={layers.risk ? visibleDistricts : []}
            fires={layers.fires ? fires : []}
            focusId={focusId}
            onFocusChange={setFocusId}
          />
        </div>

        <div className="dv3-hero-overlay-top">
          <div className="dv3-live-tag">
            <span className="dv3-live-pulse"></span>
            {r.live}
          </div>
        </div>

        {layers.weather && (weatherTemp != null || weatherHum != null || weatherWind != null) && (
          <div className="dv3-weather-chips">
            {weatherTemp != null && (
              <div className="dv3-w-chip"><TempIcon />{weatherTemp}°<span className="dv3-w-unit">C</span></div>
            )}
            {weatherHum != null && (
              <div className="dv3-w-chip"><DropIcon />{weatherHum}<span className="dv3-w-unit">%</span></div>
            )}
            {weatherWind != null && (
              <div className="dv3-w-chip"><WindIcon />{weatherWind}<span className="dv3-w-unit">km/h {weatherDir}</span></div>
            )}
          </div>
        )}

        {focus && (
          <div className="dv3-focus-sheet">
            <div className="dv3-focus-info">
              <div className="dv3-focus-title-row">
                <h2>{focus.district_name}</h2>
                <Link
                  className="dv3-btn-secondary"
                  href={`/${locale}/districts/${focus.district_id}`}
                >
                  District <ArrowIcon style={{ width: 12, height: 12 }} />
                </Link>
              </div>
              <span className="dv3-focus-class">
                <span>{riskClassFromProb(focus.max_fire_prob, locale)}</span>
                {focus.high_or_very_high_area_pct != null && (
                  <span>{(focus.high_or_very_high_area_pct).toFixed(1)}% {r.highArea}</span>
                )}
                {focus.hotspot_count_24h != null && (
                  <span>{focus.hotspot_count_24h} {r.hotspots}</span>
                )}
              </span>
            </div>
            <div className="dv3-focus-prob" data-tier={focusTier(focus.max_fire_prob ?? 0)}>
              <div className="dv3-pct">{Math.round((focus.max_fire_prob ?? 0) * 100)}%</div>
              <div className="dv3-lbl">{t.maxProb || "MAX %"}</div>
            </div>
          </div>
        )}

        {/* Ask AI — floating pill above the always-visible focus sheet; opens
            a 420px panel anchored at the same spot. Desktop variant closes
            on outside click (mobile keeps ✕-only since its panel is full-bleed). */}
        <AskAI locale={locale} closeOnOutsideClick />
      </div>

      {/* RIGHT RAIL — search + filters + layers + legend */}
      <aside className="dv3-rail">
        <div className="dv3-search-box">
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={r.search}
          />
        </div>

        <div>
          <div className="dv3-rail-eyebrow">{r.filter}</div>
          <div className="dv3-chips">
            {[
              { k: "all",      l: r.chipAll },
              { k: "critical", l: r.chipCritical },
              { k: "high",     l: r.chipHigh }
            ].map((c) => (
              <button
                key={c.k}
                type="button"
                className={"dv3-chip" + (filter === c.k ? " active" : "")}
                onClick={() => setFilter(c.k)}
              >
                {c.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="dv3-rail-eyebrow">{r.layers}</div>
          {[
            { k: "risk",    l: r.layerRisk },
            { k: "fires",   l: r.layerFires },
            { k: "weather", l: r.layerWeather }
          ].map((lyr) => (
            <label key={lyr.k} className="dv3-layer-row">
              <span>{lyr.l}</span>
              <span className={"dv3-toggle" + (layers[lyr.k] ? " is-on" : "")}>
                <input
                  type="checkbox"
                  checked={!!layers[lyr.k]}
                  onChange={(e) => setLayers({ ...layers, [lyr.k]: e.target.checked })}
                />
                <span className="dv3-toggle-track"><span className="dv3-toggle-thumb" /></span>
              </span>
            </label>
          ))}
        </div>

        <div>
          <div className="dv3-rail-eyebrow">{r.legend}</div>
          <div className="dv3-legend-strip">
            {legendRows.map((l, i) => (
              <div key={i} style={{ background: l.color }} />
            ))}
          </div>
          <div className="dv3-legend-axis"><span>0%</span><span>50%</span><span>100%</span></div>
          <div className="dv3-legend-list">
            {legendRows.map((l, i) => (
              <div key={i} className="dv3-legend-row">
                <span className="dv3-legend-swatch" style={{ background: l.color }} />
                <span>{l.class}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dv3-rail-source">
          <div>{r.sources}</div>
          <div>{r.updated} {runDate}</div>
        </div>
      </aside>
    </div>
  );
}
