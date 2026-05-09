"use client";

import { useMemo, useState } from "react";
import MobileTopBar from "./MobileTopBar";
import MobileBgParticles from "./MobileBgParticles";

const SearchIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const GROUP_LABELS = {
  en: { today: "Today", yesterday: "Yesterday" },
  tr: { today: "Bugün", yesterday: "Dün" }
};

function shortTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function dayKeyOf(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByDay(alerts, labels) {
  const today = new Date();
  const todayKey = dayKeyOf(today.toISOString());
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  const yesterdayKey = dayKeyOf(yest.toISOString());

  const map = new Map();
  for (const a of alerts) {
    const k = dayKeyOf(a.sent_at) || "_unknown";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(a);
  }

  const keys = [...map.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return keys.map((k) => {
    let label;
    if (k === todayKey) label = labels.today;
    else if (k === yesterdayKey) label = labels.yesterday;
    else if (k === "_unknown") label = "—";
    else {
      const [y, m, d] = k.split("-");
      label = `${d}/${m}/${y}`;
    }
    return { key: k, label, items: map.get(k) };
  });
}

export default function MobileAlertsContent({
  locale = "en",
  messages,
  alerts = [],
  runDate = "-"
}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    let arr = alerts;
    if (filter !== "all") {
      arr = arr.filter((a) => (a.severity || "").toLowerCase() === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((a) => (a.district_name || "").toLowerCase().includes(q));
    }
    return arr;
  }, [alerts, filter, search]);

  const labels = GROUP_LABELS[locale] || GROUP_LABELS.en;
  const groups = useMemo(() => groupByDay(rows, labels), [rows, labels]);

  const t = messages?.alerts || {};

  return (
    <div className="m-alerts">
      <MobileBgParticles />
      <MobileTopBar tab="alerts" locale={locale} runDate={runDate} showScale={false} />

      <div className="m-alerts-scroll">
        <div className="m-alerts-toolbar">
          <div className="m-alerts-search">
            <SearchIcon width="16" height="16" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search || "Search by district…"}
            />
          </div>
          <div className="m-alerts-chips">
            {[
              { k: "all",      l: t.all || "All" },
              { k: "critical", l: t.critical || "Critical" },
              { k: "warning",  l: t.warning || "Warning" },
              { k: "watch",    l: t.watch || "Watch" }
            ].map((c) => (
              <button
                key={c.k}
                type="button"
                className={"m-alerts-chip" + (filter === c.k ? " active" : "")}
                onClick={() => setFilter(c.k)}
              >
                {c.l}
              </button>
            ))}
          </div>
          <div className="m-alerts-count">
            {rows.length} {messages?.common?.of || "of"} {alerts.length}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="m-alerts-empty">—</div>
        ) : (
          groups.map((g) => (
            <section key={g.key} className="m-alerts-group">
              <div className="m-alerts-group-head">
                <h3>{g.label}</h3>
                <span>{g.items.length} {messages?.common?.alerts || "alerts"}</span>
              </div>
              <div className="m-alerts-list">
                {g.items.map((a) => {
                  const sev = (a.severity || "").toLowerCase();
                  return (
                    <article key={a.alert_id || a.id} className="m-alert-card" data-sev={sev}>
                      <div className="m-alert-card-head">
                        <span className="m-alert-sev" data-sev={a.severity}>{a.severity}</span>
                        <span className="m-alert-time">{shortTime(a.sent_at)}</span>
                      </div>
                      <div className="m-alert-name">{a.district_name}</div>
                      {(a.trigger_reason || a.reason) && (
                        <p className="m-alert-reason">{a.trigger_reason || a.reason}</p>
                      )}
                      <div className="m-alert-metrics">
                        <span><b>{Math.round((a.max_fire_prob ?? 0) * 100)}%</b> {t.maxProb || "Max"}</span>
                        <span><b>{(a.high_or_very_high_area_pct ?? 0).toFixed(1)}%</b> {t.highArea || "Area"}</span>
                        <span><b>{a.hotspot_count_24h ?? 0}</b> {t.hotspots || "Hotspots"}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
