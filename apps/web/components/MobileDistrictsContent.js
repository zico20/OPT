"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import MobileTopBar from "./MobileTopBar";
import MobileBgParticles from "./MobileBgParticles";

const SearchIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const TITLES = {
  en: { title: "Districts", search: "Search districts…" },
  tr: { title: "İlçeler", search: "İlçe ara…" }
};

function tierOf(p) {
  if (p == null) return "vlow";
  if (p >= 0.85) return "vhigh";
  if (p >= 0.6) return "high";
  if (p >= 0.4) return "med";
  if (p >= 0.2) return "low";
  return "vlow";
}
function tierColor(p) {
  // Mirrors desktop V3 risk gradient (blue → red).
  return { vhigh: "#ef4444", high: "#f59e0b", med: "#b8d96b", low: "#4d9bd6", vlow: "#2563d8" }[tierOf(p)];
}
function riskClassFromProb(p, locale = "en") {
  const RISK = {
    en: { vhigh: "Very High", high: "High", med: "Medium", low: "Low", vlow: "Very Low" },
    tr: { vhigh: "Çok Yüksek", high: "Yüksek", med: "Orta", low: "Düşük", vlow: "Çok Düşük" }
  };
  return (RISK[locale] || RISK.en)[tierOf(p)];
}

export default function MobileDistrictsContent({
  locale = "en",
  messages,
  districts = [],
  runDate = "-"
}) {
  const [sort, setSort] = useState("risk");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    let arr = [...districts];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((d) => (d.district_name || "").toLowerCase().includes(q));
    }
    if (sort === "risk") arr.sort((a, b) => (b.max_fire_prob ?? 0) - (a.max_fire_prob ?? 0));
    if (sort === "name") arr.sort((a, b) => (a.district_name || "").localeCompare(b.district_name || ""));
    if (sort === "area") arr.sort((a, b) => (b.high_or_very_high_area_pct ?? 0) - (a.high_or_very_high_area_pct ?? 0));
    return arr;
  }, [districts, sort, search]);

  const t = messages?.home || {};
  const titles = TITLES[locale] || TITLES.en;

  return (
    <div className="m-districts">
      <MobileBgParticles />
      <MobileTopBar tab="more" locale={locale} runDate={runDate} showScale={false} rightSlot={<span className="m-topbar-date">{runDate}</span>} />

      <div className="m-districts-scroll">
        <div className="m-districts-toolbar">
          <div className="m-alerts-search">
            <SearchIcon width="16" height="16" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={titles.search}
            />
          </div>
          <div className="m-alerts-chips">
            {[
              { k: "risk", l: t.maxProb || "Risk" },
              { k: "name", l: t.district || "Name" },
              { k: "area", l: t.highArea || "Area" }
            ].map((s) => (
              <button
                key={s.k}
                type="button"
                className={"m-alerts-chip" + (sort === s.k ? " active" : "")}
                onClick={() => setSort(s.k)}
              >
                {s.l}
              </button>
            ))}
          </div>
          <div className="m-alerts-count">
            {rows.length} {messages?.common?.of || "of"} {districts.length}
          </div>
        </div>

        <div className="m-district-list">
          {rows.map((d) => {
            const color = tierColor(d.max_fire_prob);
            const pct = Math.round((d.max_fire_prob ?? 0) * 100);
            const hotspots = d.hotspot_count_24h ?? 0;
            return (
              <Link
                key={d.district_id}
                href={`/${locale}/districts/${d.district_id}`}
                className="m-district-card"
              >
                <span className="m-district-swatch" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
                <div className="m-district-body">
                  <div className="m-district-name">{d.district_name}</div>
                  <div className="m-district-sub">
                    {riskClassFromProb(d.max_fire_prob, locale)}
                    {hotspots > 0 ? ` · ${hotspots} ${t.hotspots || "hotspots"}` : ""}
                  </div>
                </div>
                <div className="m-district-num">
                  <strong>{pct}%</strong>
                  <span>{t.maxProb || "Max"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
