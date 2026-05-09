"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "dv3-theme";
const THEME_EVENT = "dv3-theme-change";

const SunIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
  </svg>
);
const MoonIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10z" />
  </svg>
);

// Risk gradient — matches the desktop V3 legend (blue → red NOAA-style).
// Kept aligned with `tierColor` in DesktopLiveMapV3 / MobileLiveMapV3Client
// so the topbar strip, map dots, and leaderboard swatches all read the same.
const SCALE_CELLS = [
  { key: "very-low", color: "#2563d8" },
  { key: "low", color: "#4d9bd6" },
  { key: "medium", color: "#b8d96b" },
  { key: "high", color: "#f59e0b" },
  { key: "very-high", color: "#ef4444" },
  { key: "fire", color: "#ef4444" }
];

const TITLES = {
  en: { live: "Live", about: "About", more: "Settings", methodology: "Methodology", alerts: "Alerts" },
  tr: { live: "Canlı", about: "Hakkında", more: "Ayarlar", methodology: "Metodoloji", alerts: "Uyarılar" }
};

export default function MobileTopBar({
  tab = "live",
  locale = "en",
  runDate = "-",
  showScale = true,
  rightSlot = null
}) {
  const titles = TITLES[locale] || TITLES.en;
  const title = titles[tab] || "";

  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light") {
        setTheme("light");
        document.documentElement.classList.add("dv3-light");
      }
    } catch (_) {}
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") document.documentElement.classList.add("dv3-light");
    else document.documentElement.classList.remove("dv3-light");
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme: next } }));
  }

  return (
    <header className="m-topbar" data-tab={tab}>
      <div className="m-topbar-row">
        <div className="m-topbar-brand" aria-label="HazardSignal">
          <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
            <defs>
              <linearGradient id="hs-arc-mtopbar" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff5a1f" />
                <stop offset="100%" stopColor="#ff8a3d" />
              </linearGradient>
            </defs>
            <path d="M 8 42 A 24 24 0 0 1 56 42" fill="none" stroke="url(#hs-arc-mtopbar)" strokeWidth="3.4" strokeLinecap="round" opacity="0.95" />
            <path d="M 16 42 A 16 16 0 0 1 48 42" fill="none" stroke="url(#hs-arc-mtopbar)" strokeWidth="3.4" strokeLinecap="round" opacity="0.6" />
            <path d="M 23 42 A 9 9 0 0 1 41 42" fill="none" stroke="url(#hs-arc-mtopbar)" strokeWidth="3.4" strokeLinecap="round" opacity="0.3" />
            <circle cx="32" cy="42" r="3.4" fill="#ff8a3d" />
            <circle cx="32" cy="42" r="1.6" fill="#ffffff" opacity="0.95" />
          </svg>
          <span className="m-topbar-title">{title}</span>
        </div>

        <div className="m-topbar-right">
          {rightSlot}
          {!rightSlot && <span className="m-topbar-date">{runDate}</span>}
          <button
            type="button"
            className="m-topbar-theme"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <SunIcon width="16" height="16" /> : <MoonIcon width="16" height="16" />}
          </button>
        </div>
      </div>

      {showScale && (
        <div className="m-topbar-scale" role="list" aria-label="Risk scale">
          {SCALE_CELLS.map((cell) => (
            <span
              key={cell.key}
              className="m-topbar-scale-cell"
              style={{ backgroundColor: cell.color }}
              role="listitem"
              title={cell.key}
            />
          ))}
        </div>
      )}
    </header>
  );
}
