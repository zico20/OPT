
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildLocalePath } from "../lib/i18n";
import MicroIcon from "./MicroIcon";

const LABELS = {
  en: { dashboard: "Home", alerts: "Alerts", map: "Map", methodology: "Method" },
  ar: { dashboard: "لوحة", alerts: "تنبيهات", map: "خريطة", methodology: "منهجية" },
  tr: { dashboard: "Panel", alerts: "Uyari", map: "Harita", methodology: "Yontem" }
};

function deriveCurrentPath(pathname = "", locale = "en") {
  const parts = String(pathname || "/").split("/").filter(Boolean);
  if (parts[0] === locale) {
    const rest = parts.slice(1).join("/");
    return rest ? "/" + rest : "/";
  }
  return pathname || "/";
}

function routeKey(currentPath) {
  if (currentPath === "/map") return "map";
  if (currentPath === "/alerts") return "alerts";
  if (currentPath === "/methodology") return "methodology";
  return "dashboard";
}
export default function MobileBottomNav({ locale, messages, locales = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const currentPath = deriveCurrentPath(pathname, locale);
  const labels = LABELS[locale] || LABELS.en;
  const activeKey = routeKey(currentPath);
  const currentLabel = String(locale || "en").toUpperCase();
  const exactDashboard = currentPath === "/";
  const sortedLocales = useMemo(() => {
    const current = locales.find((entry) => entry.code === locale);
    const rest = locales.filter((entry) => entry.code !== locale);
    return current ? [current].concat(rest) : locales;
  }, [locale, locales]);

  useEffect(() => {
    function handlePointer(event) {
      if (!rootRef.current || rootRef.current.contains(event.target)) return;
      setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointer);
    return () => window.removeEventListener("pointerdown", handlePointer);
  }, []);

  if (currentPath.startsWith("/admin")) return null;

  const navItems = [
    { key: "dashboard", href: "/" + locale, label: labels.dashboard, icon: "grid" },
    { key: "alerts", href: "/" + locale + "/alerts", label: labels.alerts, icon: "bell" },
    { key: "map", href: "/" + locale + "/map", label: labels.map, icon: "map" },
    { key: "methodology", href: "/" + locale + "/methodology", label: labels.methodology, icon: "book" }
  ];

  function handleDashboardClick(event) {
    if (!exactDashboard) {
      setOpen(false);
      return;
    }
    event.preventDefault();
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mobile-bottom-nav-wrap" ref={rootRef}>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={["mobile-bottom-nav-item", activeKey === item.key ? "active" : ""].filter(Boolean).join(" ")}
            onClick={item.key === "dashboard" ? handleDashboardClick : undefined}
          >
            <MicroIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="mobile-bottom-nav-locale">
          <button
            type="button"
            className={["mobile-bottom-nav-item", open ? "active" : ""].filter(Boolean).join(" ")}
            aria-expanded={open}
            aria-label={messages.common.language || "Language"}
            onClick={() => setOpen((value) => !value)}
          >
            <MicroIcon name="lang" />
            <span>{currentLabel}</span>
          </button>

          <div className={["mobile-locale-sheet", open ? "open" : ""].filter(Boolean).join(" ")}>
            {sortedLocales.map((entry) => (
              <button
                key={entry.code}
                type="button"
                className={["mobile-locale-item", entry.code === locale ? "active" : ""].filter(Boolean).join(" ")}
                onClick={() => {
                  setOpen(false);
                  router.push(buildLocalePath(entry.code, currentPath));
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
