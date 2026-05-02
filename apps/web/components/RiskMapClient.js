"use client";

import { useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, WMSTileLayer, ZoomControl } from "react-leaflet";
import { classFromMaxProb, formatPercent, formatProb, riskBadgeTone, severityColor } from "../lib/format";
import { localizeRiskClass } from "../lib/i18n";

const DEFAULT_CENTER = [36.9, 30.7];

function riskColor(label) {
  switch (label) {
    case "Very High":
      return "#d73027";
    case "High":
      return "#fdae61";
    case "Medium":
      return "#ffffbf";
    case "Low":
      return "#91bfdb";
    default:
      return "#4575b4";
  }
}

function t(messages, key, fallback) {
  return messages?.[key] || fallback;
}

export default function RiskMapClient({ districts, fires, messages, locale = "en", missionState = "monitoring" }) {
  const [showEffis, setShowEffis] = useState(false);

  const legendRows = [
    { label: localizeRiskClass("Low", locale), short: "Low", color: riskColor("Low") },
    { label: localizeRiskClass("Medium", locale), short: "Mod", color: riskColor("Medium") },
    { label: localizeRiskClass("High", locale), short: "High", color: riskColor("High") },
    { label: localizeRiskClass("Very High", locale), short: "V.High", color: riskColor("Very High") },
    { label: "Fire", short: "Fire", color: "#ef4444", hotspot: true }
  ];

  return (
    <div className={["map-shell", "ops-map-shell", "mission-map", "mission-" + missionState].join(" ")}>
      <MapContainer center={DEFAULT_CENTER} zoom={8} scrollWheelZoom zoomControl={false} style={{ minHeight: 520 }} className="ops-map">
        <ZoomControl position="bottomleft" />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showEffis && (
          <WMSTileLayer
            url="https://maps.wild-fire.eu/effis"
            layers="modis.ba.2024,modis.ba.2023"
            format="image/png"
            transparent={true}
            opacity={0.65}
            attribution="© EFFIS / JRC"
          />
        )}
        {districts.map((district) => {
          const peakClass = classFromMaxProb(district.max_fire_prob);
          return (
          <CircleMarker
            key={district.district_id}
            center={[district.lat, district.lon]}
            pathOptions={{
              color: riskColor(peakClass),
              fillColor: riskColor(peakClass),
              fillOpacity: 0.88,
              weight: 2,
              opacity: 0.92
            }}
            radius={9 + Math.round(Number(district.max_fire_prob) * 10)}
          >
            <Popup className="ops-popup" closeButton={false}>
              <div className="map-popup">
                <div className="map-popup-header">
                  <span className={["badge", riskBadgeTone(peakClass)].join(" ")}>
                    {localizeRiskClass(peakClass, locale)}
                  </span>
                  <strong>{district.district_name}</strong>
                </div>
                <div className="map-popup-grid">
                  <div className="map-popup-metric">
                    <span className="map-popup-label">{t(messages, "maxProb", "Max probability")}</span>
                    <span className="map-popup-value">{formatProb(district.max_fire_prob, locale)}</span>
                  </div>
                  <div className="map-popup-metric">
                    <span className="map-popup-label">{t(messages, "highArea", "High/very-high area")}</span>
                    <span className="map-popup-value">{formatPercent(district.high_or_very_high_area_pct, locale)}</span>
                  </div>
                  <div className="map-popup-metric">
                    <span className="map-popup-label">{t(messages, "hotspots", "Hotspots (24h)")}</span>
                    <span className="map-popup-value">{district.hotspot_count_24h}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
          );
        })}
        {fires.map((fire) => (
          <CircleMarker
            key={fire.fire_id}
            center={[fire.lat, fire.lon]}
            pathOptions={{
              color: severityColor("Critical"),
              fillColor: severityColor("Critical"),
              fillOpacity: 0.95,
              weight: 2,
              opacity: 0.95
            }}
            radius={missionState === "incident" ? 8 : 6.5}
          >
            <Popup className="ops-popup" closeButton={false}>
              <div className="map-popup">
                <div className="map-popup-header">
                  <span className="badge critical">{t(messages, "activeFires", "Active fires (24h)")}</span>
                  <strong>{fire.district_name}</strong>
                </div>
                <div className="map-popup-grid">
                  <div className="map-popup-metric">
                    <span className="map-popup-label">{t(messages, "source", "Source")}</span>
                    <span className="map-popup-value">{fire.source || "-"}</span>
                  </div>
                  <div className="map-popup-metric">
                    <span className="map-popup-label">{t(messages, "confidence", "Confidence")}</span>
                    <span className="map-popup-value">{fire.confidence || "-"}</span>
                  </div>
                  <div className="map-popup-metric">
                    <span className="map-popup-label">{t(messages, "detected", "Detected")}</span>
                    <span className="map-popup-value">{fire.detected_at || "-"}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="map-overlay-top">
        <div className="map-chip">
          <span className="map-chip-dot forest" />
          {t(messages, "opsView", "Operations map")}
        </div>
        <div className="map-chip secondary">
          {t(messages, "districtRisk", "District risk")}
        </div>
        <button
          className={["map-chip", "map-effis-toggle", showEffis ? "active" : ""].filter(Boolean).join(" ")}
          onClick={() => setShowEffis((v) => !v)}
          title="Toggle EFFIS historical burned areas (2023–2024)"
        >
          🔥 {showEffis ? "Hide fire scars" : "Show fire scars"}
        </button>
      </div>

      <aside className="map-legend-card">
        <div className="map-legend-title">{t(messages, "legendTitle", "Signal legend")}</div>
        <div className="map-legend-list">
          {legendRows.map((entry) => (
            <div className="map-legend-row" key={entry.label}>
              <span
                className={["map-legend-swatch", entry.hotspot ? "hotspot" : ""].filter(Boolean).join(" ")}
                style={{ backgroundColor: entry.color }}
              />
              <span className="map-legend-full">{entry.label}</span>
              <span className="map-legend-short">{entry.short}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

