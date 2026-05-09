"use client";

// Match the V3 desktop weather chips: SVG icons in brand accent, mono font,
// pill border in soft orange, unit in muted ink. Brand Guidelines uses
// `.dv3-w-chip`; we re-use the same class so it picks up the desktop styles
// + light-theme overrides automatically.
const TempIcon = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M14 4a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0V4z" /></svg>);
const DropIcon = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /></svg>);
const WindIcon = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 8h12a3 3 0 1 0-3-3M3 16h15a3 3 0 1 1-3 3M3 12h18" /></svg>);

function fmtTemp(v) {
  if (v == null) return null;
  return Number(v).toFixed(1);
}
function fmtPct(v) {
  if (v == null) return null;
  return Math.round(Number(v));
}
function fmtWind(v) {
  if (v == null) return null;
  return Number(v).toFixed(1);
}

export default function MobileWeatherFloats({ weather }) {
  const current = weather?.current;
  if (!current) return null;

  const temp = fmtTemp(current.temp_c);
  const hum = fmtPct(current.humidity_pct);
  const wind = fmtWind(current.wind_speed_kmh);
  const dir = current.wind_direction || "";

  return (
    <div className="m-weather-floats dv3-weather-strip" role="group" aria-label="Current weather">
      {temp != null && (
        <div className="dv3-w-chip"><TempIcon />{temp}°<span className="dv3-w-unit">C</span></div>
      )}
      {hum != null && (
        <div className="dv3-w-chip"><DropIcon />{hum}<span className="dv3-w-unit">%</span></div>
      )}
      {wind != null && (
        <div className="dv3-w-chip"><WindIcon />{wind}<span className="dv3-w-unit">km/h {dir}</span></div>
      )}
    </div>
  );
}
