"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "hs_splash_seen";
const VISIBLE_MS = 2000;
const FADE_MS = 500;

export default function SplashScreen() {
  const [stage, setStage] = useState("init");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setStage("hidden");
        return undefined;
      }
    } catch (_) {
      // ignore storage errors (e.g. private mode)
    }

    setStage("visible");

    const fadeTimer = setTimeout(() => setStage("exiting"), VISIBLE_MS);
    const hideTimer = setTimeout(() => {
      setStage("hidden");
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch (_) {
        // ignore
      }
    }, VISIBLE_MS + FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (stage === "hidden") return null;

  return (
    <div
      className={["splash-screen", stage === "exiting" ? "exiting" : ""].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <div className="splash-glow" />
      <div className="splash-content">
        <div className="splash-mark">
          <span className="splash-mark-dot" />
        </div>
        <h1 className="splash-title">HazardSignal</h1>
        <p className="splash-tagline">Daily wildfire signals</p>
      </div>
    </div>
  );
}
