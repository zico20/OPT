"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import RiskMapShell from "./RiskMapShell";
import MobileTopBar from "./MobileTopBar";
import MobileMapLayerToggles from "./MobileMapLayerToggles";

const SEVERITY_PILL = {
  critical: { label: "CRITICAL", icon: "🔥" },
  warning: { label: "WARNING", icon: "⚠️" },
  watch: { label: "WATCH", icon: "👁" },
  monitoring: { label: "MONITORING", icon: "✅" }
};

function classFromProb(prob) {
  if (prob >= 0.8) return "very-high";
  if (prob >= 0.6) return "high";
  if (prob >= 0.4) return "medium";
  if (prob >= 0.2) return "low";
  return "very-low";
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

const SNAP_POINTS = ["140px", 0.7];

export default function MobileMapConsole({
  districts = [],
  fires = [],
  messages,
  locale = "en",
  missionState = "monitoring",
  runDate = "-"
}) {
  const [layers, setLayers] = useState({ districts: true, fires: true });
  const [snap, setSnap] = useState(SNAP_POINTS[0]);

  const top3 = districts.slice(0, 3);
  const lead = top3[0] || null;
  const leadProbClass = lead ? classFromProb(Number(lead.max_fire_prob || 0)) : "very-low";
  const leadColor = colorFromClass(leadProbClass);
  const severityKey = (lead?.operational_severity || missionState || "monitoring").toLowerCase();
  const pill = SEVERITY_PILL[severityKey] || SEVERITY_PILL.monitoring;
  const probDisplay = Number(lead?.max_fire_prob || 0).toFixed(2);

  const visibleDistricts = layers.districts ? districts : [];
  const visibleFires = layers.fires ? fires : [];

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

      <Drawer.Root
        open
        modal={false}
        dismissible={false}
        snapPoints={SNAP_POINTS}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
      >
        <Drawer.Portal>
          <Drawer.Content className="m-sheet-content">
            <Drawer.Title className="m-sheet-sr-only">Top districts</Drawer.Title>
            <div className="m-sheet-handle" aria-hidden="true" />

            <div className="m-sheet">
              <div className="m-sheet-peek">
                <div className="m-live-pill" data-severity={severityKey}>
                  <span className="m-live-pill-icon" aria-hidden="true">{pill.icon}</span>
                  <span className="m-live-pill-text">{pill.label}</span>
                </div>

                <div className="m-live-headline">
                  <div className="m-live-district">
                    <strong className="m-live-name">{lead?.district_name || "—"}</strong>
                    <span className="m-live-sub">
                      {lead?.dominant_risk_class || "—"}
                      {lead?.hotspot_count_24h > 0 ? ` · ${lead.hotspot_count_24h} hotspot${lead.hotspot_count_24h === 1 ? "" : "s"}` : ""}
                    </span>
                  </div>
                  <div className="m-live-badge" style={{ backgroundColor: leadColor }} data-class={leadProbClass}>
                    <span className="m-live-badge-num">{probDisplay}</span>
                    <span className="m-live-badge-label">prob</span>
                  </div>
                </div>
              </div>

              <div className="m-sheet-list">
                <h3 className="m-sheet-list-title">Top 3 districts</h3>
                {top3.map((d, i) => {
                  const cls = classFromProb(Number(d.max_fire_prob || 0));
                  const color = colorFromClass(cls);
                  return (
                    <div className="m-sheet-item" key={d.district_id || i} data-rank={i + 1}>
                      <div className="m-sheet-item-rank" style={{ backgroundColor: color }}>
                        {i + 1}
                      </div>
                      <div className="m-sheet-item-body">
                        <strong className="m-sheet-item-name">{d.district_name}</strong>
                        <span className="m-sheet-item-class">{d.dominant_risk_class || "—"}</span>
                      </div>
                      <div className="m-sheet-item-prob">
                        <span className="m-sheet-item-prob-num">{Number(d.max_fire_prob || 0).toFixed(2)}</span>
                        <span className="m-sheet-item-prob-label">prob</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
