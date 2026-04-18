"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNavMenu({ locale, messages }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const items = [
    { href: "/" + locale, label: messages.nav.dashboard },
    { href: "/" + locale + "/alerts", label: messages.nav.alerts },
    { href: "/" + locale + "/map", label: messages.nav.map || "Map" },
    { href: "/" + locale + "/methodology", label: messages.nav.methodology }
  ];

  return (
    <>
      <div className="mobile-top-bar">
        <span className="mobile-top-bar-brand">HazardSignal</span>
        <button
          type="button"
          className={["mobile-hamburger", open ? "open" : ""].filter(Boolean).join(" ")}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={["mobile-nav-overlay", open ? "open" : ""].filter(Boolean).join(" ")}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      >
        <div
          className="mobile-nav-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="mobile-nav-close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>

          <nav className="mobile-nav-links">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="mobile-nav-link"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
