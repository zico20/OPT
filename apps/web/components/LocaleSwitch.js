"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildLocalePath } from "../lib/i18n";

function derivePathFromPathname(pathname, locale) {
  const safePath = String(pathname || "/");
  const segments = safePath.split("/").filter(Boolean);

  if (segments[0] === locale) {
    const remainder = segments.slice(1).join("/");
    return remainder ? `/${remainder}` : "/";
  }

  return safePath;
}

export default function LocaleSwitch({ locale, path, locales = [], className = "" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const currentPath = path || derivePathFromPathname(pathname, locale);

  useEffect(() => {
    function handlePointer(event) {
      if (!rootRef.current || rootRef.current.contains(event.target)) {
        return;
      }
      setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointer);
    return () => window.removeEventListener("pointerdown", handlePointer);
  }, []);

  return (
    <div className={["locale-dock", open ? "open" : "", className].filter(Boolean).join(" ")} ref={rootRef}>
      <button
        type="button"
        className="locale-trigger"
        aria-label="Language switcher"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {String(locale || "en").toUpperCase()}
      </button>

      <div className="locale-menu" role="menu">
        {locales.map((entry) => {
          const href = buildLocalePath(entry.code, currentPath);
          const active = entry.code === locale;

          return (
            <Link
              key={entry.code}
              href={href}
              className={`locale-item ${active ? "active" : ""}`.trim()}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {entry.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

