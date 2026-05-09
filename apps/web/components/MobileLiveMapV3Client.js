"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { localizeRiskClass } from "../lib/i18n";
import { classFromMaxProb } from "../lib/format";

function tierOf(p) {
  if (p == null) return "vlow";
  if (p >= 0.85) return "vhigh";
  if (p >= 0.6) return "high";
  if (p >= 0.4) return "med";
  if (p >= 0.2) return "low";
  return "vlow";
}
function tierColor(p) {
  const t = tierOf(p);
  // Mirrors DesktopLiveMapV3 (blue → red NOAA-style risk gradient).
  return { vhigh: "#ef4444", high: "#f59e0b", med: "#b8d96b", low: "#4d9bd6", vlow: "#2563d8" }[t];
}

// Mobile dot is a hair smaller than desktop and skips the inline label pill —
// labels at this density on a small screen are unreadable. Tap the dot to see
// the district details in the bottom sheet / popup.
function buildDistrictIcon(d) {
  const tier = tierOf(d.max_fire_prob);
  const color = tierColor(d.max_fire_prob);
  const sizeMap = { vhigh: 22, high: 18, med: 15, low: 12, vlow: 10 };
  const size = sizeMap[tier];
  const hasFire = (d.hotspot_count_24h ?? 0) > 0;
  const html = `
    <div class="dv3-leaf-dot${hasFire ? " has-fire" : ""}" style="
      width:${size}px;height:${size}px;
      background:${color};
      box-shadow:0 0 0 2px rgba(15,15,20,0.55), 0 0 ${hasFire ? 16 : 10}px ${color};
    "></div>
  `;
  return L.divIcon({
    html,
    className: "dv3-leaf-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function buildFireIcon() {
  const html = `
    <div class="dv3-leaf-fire">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2c1 4-2 5-2 8a4 4 0 0 0 8 0c0-2-1-3-2-4 1 6-3 8-3 8s2-4-1-6c0-2 1-4 0-6z"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: "dv3-leaf-fire-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

// Leaflet sometimes computes container size at 0 if the parent flex column
// hasn't laid out yet on first mount. Force an invalidateSize after the
// initial paint + once again on the next animation frame so tiles fill.
function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    if (!map) return undefined;
    const t1 = setTimeout(() => map.invalidateSize(), 0);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

export default function MobileLiveMapV3Client({
  districts = [],
  fires = [],
  locale = "en",
  showFires = true
}) {
  const center = [36.9, 31.0];

  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsLight(document.documentElement.classList.contains("dv3-light"));
    }
    function onThemeChange(e) {
      setIsLight(e.detail?.theme === "light");
    }
    window.addEventListener("dv3-theme-change", onThemeChange);
    return () => window.removeEventListener("dv3-theme-change", onThemeChange);
  }, []);

  const tileBase = isLight
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const tileLabels = isLight
    ? "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png";
  const bg = isLight ? "#e8e6df" : "#0a0a0c";

  return (
    <MapContainer
      center={center}
      zoom={8}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      touchZoom={true}
      doubleClickZoom={true}
      style={{ width: "100%", height: "100%", background: bg }}
    >
      <InvalidateOnMount />
      <TileLayer
        key={isLight ? "light-base" : "dark-base"}
        url={tileBase}
        subdomains="abcd"
        maxZoom={18}
        attribution="&copy; OpenStreetMap, &copy; CARTO"
      />
      <TileLayer
        key={isLight ? "light-labels" : "dark-labels"}
        url={tileLabels}
        subdomains="abcd"
        maxZoom={18}
        pane="shadowPane"
      />

      {districts.map((d) => {
        const lat = d.latitude ?? d.lat;
        const lon = d.longitude ?? d.lon;
        if (lat == null || lon == null) return null;
        const peakClass = classFromMaxProb(d.max_fire_prob);
        const pct = Math.round((d.max_fire_prob ?? 0) * 100);
        return (
          <Marker key={d.district_id} position={[lat, lon]} icon={buildDistrictIcon(d)}>
            <Popup className="dv3-fire-popup" closeButton={false}>
              <div className="dv3-fire-popup-inner">
                <div className="dv3-fire-popup-head">
                  <span className="dv3-fire-popup-dot" style={{ background: tierColor(d.max_fire_prob) }} />
                  <strong>{d.district_name}</strong>
                </div>
                <div className="dv3-fire-popup-row">
                  <span>Risk</span><strong>{localizeRiskClass(peakClass, locale)}</strong>
                </div>
                <div className="dv3-fire-popup-row">
                  <span>Max %</span><strong>{pct}%</strong>
                </div>
                {(d.hotspot_count_24h ?? 0) > 0 && (
                  <div className="dv3-fire-popup-row">
                    <span>Hotspots 24h</span><strong>{d.hotspot_count_24h}</strong>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {showFires && fires.map((f) => {
        const lat = f.latitude ?? f.lat;
        const lon = f.longitude ?? f.lon;
        if (lat == null || lon == null) return null;
        const detected = f.detected_at ? new Date(f.detected_at) : null;
        const detectedLabel = detected && !Number.isNaN(detected.getTime())
          ? detected.toLocaleString(undefined, {
              month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit"
            })
          : null;
        return (
          <Marker key={f.fire_id || f.id} position={[lat, lon]} icon={buildFireIcon()}>
            <Popup className="dv3-fire-popup" closeButton={false}>
              <div className="dv3-fire-popup-inner">
                <div className="dv3-fire-popup-head">
                  <span className="dv3-fire-popup-dot" />
                  <strong>Active Fire</strong>
                </div>
                {f.district_name && (
                  <div className="dv3-fire-popup-row">
                    <span>District</span><strong>{f.district_name}</strong>
                  </div>
                )}
                {f.source && (
                  <div className="dv3-fire-popup-row">
                    <span>Source</span><strong>{f.source}</strong>
                  </div>
                )}
                {f.confidence && (
                  <div className="dv3-fire-popup-row">
                    <span>Confidence</span><strong>{f.confidence}</strong>
                  </div>
                )}
                {detectedLabel && (
                  <div className="dv3-fire-popup-row">
                    <span>Detected</span><strong>{detectedLabel}</strong>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
