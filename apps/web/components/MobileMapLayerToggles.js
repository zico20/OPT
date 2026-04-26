"use client";

import { useState } from "react";
import MicroIcon from "./MicroIcon";

const TOGGLES = [
  { key: "districts", icon: "grid", label: "Districts" },
  { key: "fires", icon: "flame", label: "Fires" }
];

export default function MobileMapLayerToggles({ onToggle }) {
  const [active, setActive] = useState({ districts: true, fires: true });

  function flip(key) {
    setActive((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      onToggle?.(next);
      return next;
    });
  }

  return (
    <div className="m-layer-toggles" role="group" aria-label="Map layers">
      {TOGGLES.map((t) => (
        <button
          key={t.key}
          type="button"
          className={["m-layer-btn", active[t.key] ? "active" : ""].filter(Boolean).join(" ")}
          onClick={() => flip(t.key)}
          aria-pressed={active[t.key]}
          title={t.label}
        >
          <MicroIcon name={t.icon} />
        </button>
      ))}
    </div>
  );
}
