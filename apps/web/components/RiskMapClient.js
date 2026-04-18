"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { formatPercent, formatProb, riskBadgeTone, severityColor } from "../lib/format";
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
  const legendRows = [
    { label: localizeRiskClass("Very High", locale), color: riskColor("Very High") },
    { label: localizeRiskClass("High", locale), color: riskColor("High") },
    { label: localizeRiskClass("Medium", locale), color: riskColor("Medium") },
    { label: localizeRiskClass("Low", locale), color: riskColor("Low") },
    { label: localizeRiskClass("Very Low", locale), color: riskColor("Very Low") }
  ];

  return (
    <div className={["map-shell", "ops-map-shell", "mission-map", "mission-" + missionState].join(" ")}>
      <MapContainer center={DEFAULT_CENTER} zoom={8} scrollWheelZoom style={{ minHeight: 520 }} className="ops-map">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {districts.map((district) => (
          <CircleMarker
            key={district.district_id}
            center={[district.lat, district.lon]}
            pathOptions={{
              color: riskColor(district.dominant_risk_class),
              fillColor: riskColor(district.dominant_risk_class),
              fillOpacity: 0.88,
              weight: 2,
              opacity: 0.92
            }}
            radius={9 + Math.round(Number(district.max_fire_prob) * 10)}
          >
            <Popup className="ops-popup" closeButton={false}>
              <div className="map-popup">
                <div className="map-popup-header">
                  <span className={["badge", riskBadgeTone(district.dominant_risk_class)].join(" ")}>
                    {localizeRiskClass(district.dominant_risk_class, locale)}
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
        ))}
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
      </div>

      <aside className="map-legend-card">
        <div className="map-legend-title">{t(messages, "legendTitle", "Signal legend")}</div>
        <div className="map-legend-list">
          {legendRows.map((entry) => (
            <div className="map-legend-row" key={entry.label}>
              <span className="map-legend-swatch" style={{ backgroundColor: entry.color }} />
              <span>{entry.label}</span>
            </div>
          ))}
          <div className="map-legend-row">
            <span className="map-legend-swatch hotspot" />
            <span>{t(messages, "activeFires", "Active fires (24h)")}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

