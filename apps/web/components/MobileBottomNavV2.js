"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MicroIcon from "./MicroIcon";

const LABELS = {
  en: { live: "Live", alerts: "Alerts", more: "More" },
  tr: { live: "Canlı", alerts: "Uyarılar", more: "Daha" }
};

const TABS = [
  { key: "alerts", icon: "bell" },
  { key: "live", icon: "radar", primary: true },
  { key: "more", icon: "menu" }
];

function deriveSlug(pathname, locale) {
  const parts = String(pathname || "/").split("/").filter(Boolean);
  if (parts[0] === locale) return parts.slice(1).join("/");
  return parts.join("/");
}

function activeTab(slug) {
  if (slug === "" || slug === "map") return "live";
  if (slug === "alerts") return "alerts";
  if (slug === "more") return "more";
  return null;
}

function tabHref(key, locale) {
  switch (key) {
    case "live": return "/" + locale;
    case "alerts": return "/" + locale + "/alerts";
    case "more": return "/" + locale + "/more";
    default: return "/" + locale;
  }
}

export default function MobileBottomNavV2({ locale = "en" }) {
  const pathname = usePathname();
  const slug = deriveSlug(pathname, locale);

  if (slug.startsWith("admin")) return null;

  const active = activeTab(slug);
  const labels = LABELS[locale] || LABELS.en;

  return (
    <nav className="m-bnav" aria-label="Mobile navigation">
      <div className="m-bnav-inner">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tabHref(tab.key, locale)}
            className={[
              "m-bnav-item",
              tab.primary ? "m-bnav-primary" : "",
              active === tab.key ? "active" : ""
            ].filter(Boolean).join(" ")}
            aria-current={active === tab.key ? "page" : undefined}
          >
            <span className="m-bnav-icon">
              <MicroIcon name={tab.icon} />
            </span>
            <span className="m-bnav-label">{labels[tab.key]}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
