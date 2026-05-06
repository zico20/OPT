"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MobileTopBar from "./MobileTopBar";
import MicroIcon from "./MicroIcon";
import PushSubscribeButton from "./PushSubscribeButton";
import { buildLocalePath } from "../lib/i18n";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { pickAuthStrings } from "../lib/authStrings";

const COPY = {
  en: {
    notifications: "Notifications",
    telegramTitle: "Telegram alerts",
    telegramBody: "Get instant escalations on Telegram.",
    telegramCta: "Open bot",
    pushTitle: "Browser push",
    pushBody: "Quiet, on-device alerts.",
    language: "Language",
    references: "References",
    methodology: "Methodology",
    methodologyBody: "How we score risk and trigger alerts.",
    legal: "Legal",
    attribution: "Attributions",
    attributionBody: "OpenStreetMap, NASA FIRMS, Google Earth Engine."
  },
  ar: {
    notifications: "الإشعارات",
    telegramTitle: "تنبيهات Telegram",
    telegramBody: "تصلك التنبيهات الحرجة لحظياً.",
    telegramCta: "فتح البوت",
    pushTitle: "إشعارات المتصفح",
    pushBody: "إشعارات هادئة على جهازك.",
    language: "اللغة",
    references: "مراجع",
    methodology: "المنهجية",
    methodologyBody: "كيف نحسب الخطر ونطلق التنبيهات.",
    legal: "قانوني",
    attribution: "المصادر",
    attributionBody: "OpenStreetMap, NASA FIRMS, Google Earth Engine."
  },
  tr: {
    notifications: "Bildirimler",
    telegramTitle: "Telegram uyarıları",
    telegramBody: "Anında kritik uyarılar.",
    telegramCta: "Botu aç",
    pushTitle: "Tarayıcı bildirimleri",
    pushBody: "Cihazda sessiz uyarılar.",
    language: "Dil",
    references: "Kaynaklar",
    methodology: "Metodoloji",
    methodologyBody: "Riski nasıl ölçüyoruz.",
    legal: "Yasal",
    attribution: "Atıflar",
    attributionBody: "OpenStreetMap, NASA FIRMS, Google Earth Engine."
  }
};

const LOCALES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "tr", label: "Türkçe" }
];

export default function MobileMoreContent({
  locale = "en",
  runDate = "-",
  telegramUrl = "https://t.me/HazardSignalBot",
  user = null
}) {
  const router = useRouter();
  const c = COPY[locale] || COPY.en;
  const at = pickAuthStrings(locale);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
        router.refresh();
      }
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="m-more">
      <MobileTopBar tab="more" locale={locale} runDate={runDate} showScale={false} />

      <div className="m-more-scroll">
        {/* Account section sits at the top so signing in is the first thing
            visitors see in the More tab. */}
        <section className="m-more-section">
          <h3 className="m-more-section-title">{at.yourAccount}</h3>
          {user ? (
            <div className="m-more-row m-more-row-static">
              <span className="m-more-row-icon" data-tone="account">
                <MicroIcon name="user" />
              </span>
              <div className="m-more-row-body">
                <strong>{at.signedInAs}</strong>
                <span>{user.email || ""}</span>
              </div>
              <button
                type="button"
                className="m-more-row-action m-more-signout-btn"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? "…" : at.signOut}
              </button>
            </div>
          ) : (
            <Link className="m-more-row" href={"/" + locale + "/signin?next=/" + locale + "/more"}>
              <span className="m-more-row-icon" data-tone="account">
                <MicroIcon name="user" />
              </span>
              <div className="m-more-row-body">
                <strong>{at.signInBtn}</strong>
                <span>{at.signInSubtitle}</span>
              </div>
              <span className="m-more-row-action">→</span>
            </Link>
          )}
        </section>

        <section className="m-more-section">
          <h3 className="m-more-section-title">{c.notifications}</h3>

          <a className="m-more-row" href={telegramUrl} target="_blank" rel="noreferrer">
            <span className="m-more-row-icon" data-tone="telegram">
              <MicroIcon name="bell" />
            </span>
            <div className="m-more-row-body">
              <strong>{c.telegramTitle}</strong>
              <span>{c.telegramBody}</span>
            </div>
            <span className="m-more-row-action">
              {c.telegramCta} <MicroIcon name="external" />
            </span>
          </a>

          <div className="m-more-row">
            <span className="m-more-row-icon" data-tone="push">
              <MicroIcon name="bell" />
            </span>
            <div className="m-more-row-body">
              <strong>{c.pushTitle}</strong>
              <span>{c.pushBody}</span>
            </div>
            <span className="m-more-row-action">
              <PushSubscribeButton compact />
            </span>
          </div>
        </section>

        <section className="m-more-section">
          <h3 className="m-more-section-title">{c.language}</h3>
          <div className="m-more-lang">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                className={["m-more-lang-btn", l.code === locale ? "active" : ""].filter(Boolean).join(" ")}
                onClick={() => router.push(buildLocalePath(l.code, "/more"))}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>

        <section className="m-more-section">
          <h3 className="m-more-section-title">{c.references}</h3>

          <Link className="m-more-row" href={"/" + locale + "/methodology"}>
            <span className="m-more-row-icon" data-tone="docs">
              <MicroIcon name="book" />
            </span>
            <div className="m-more-row-body">
              <strong>{c.methodology}</strong>
              <span>{c.methodologyBody}</span>
            </div>
          </Link>
        </section>

        <section className="m-more-section">
          <h3 className="m-more-section-title">{c.legal}</h3>
          <div className="m-more-row m-more-row-static">
            <span className="m-more-row-icon" data-tone="info">
              <MicroIcon name="info" />
            </span>
            <div className="m-more-row-body">
              <strong>{c.attribution}</strong>
              <span>{c.attributionBody}</span>
            </div>
          </div>
        </section>

        <p className="m-more-version">HazardSignal · v2 redesign</p>
      </div>
    </div>
  );
}
