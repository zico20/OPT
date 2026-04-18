"use client";
import { useEffect, useState } from "react";

function formatAge(timestamp) {
  if (!timestamp) return null;
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (ageMs < 0) return null;
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LastUpdatedBadge({ timestamp, className = "" }) {
  const [label, setLabel] = useState(() => formatAge(timestamp));

  useEffect(() => {
    setLabel(formatAge(timestamp));
    const id = setInterval(() => setLabel(formatAge(timestamp)), 60000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (!label) return null;

  return (
    <span className={["last-updated-badge", className].filter(Boolean).join(" ")}>
      <span className="last-updated-dot" />
      Updated {label}
    </span>
  );
}
