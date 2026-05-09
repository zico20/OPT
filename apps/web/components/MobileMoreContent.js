"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileTopBar from "./MobileTopBar";
import MobileBgParticles from "./MobileBgParticles";
import MicroIcon from "./MicroIcon";
import PushSubscribeButton from "./PushSubscribeButton";
import { buildLocalePath } from "../lib/i18n";

const SOCIAL = {
  instagram: "https://instagram.com/hazardsignal",
  facebook:  "https://facebook.com/hazardsignal",
  x:         "https://x.com/hazardsignal"
};

const InstagramGlyph = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" /></svg>);
const FacebookGlyph = (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M14 9V7c0-1.1.9-2 2-2h2V2h-3a4 4 0 0 0-4 4v3H8v3h3v9h3v-9h2.5l.5-3H14z" /></svg>);
const XGlyph = (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.5L4.5 21H1.3l7.5-8.6L1 3h6.5l4.5 5.9L17.5 3zm-1.1 16h1.8L7.7 5h-2l10.7 14z" /></svg>);

const COPY = {
  en: {
    notifications: "Notifications",
    telegramTitle: "Telegram alerts",
    telegramBody: "Get instant escalations on Telegram.",
    telegramCta: "Open bot",
    pushTitle: "Browser push",
    pushBody: "Quiet, on-device alerts.",
    follow: "Follow",
    language: "Language",
    references: "References",
    districts: "All districts",
    districtsBody: "Browse the full leaderboard.",
    about: "About HazardSignal",
    aboutBody: "Mission, coverage, and credits.",
    methodology: "Methodology",
    methodologyBody: "How we score risk and trigger alerts.",
    legal: "Legal",
    attribution: "Attributions",
    attributionBody: "OpenStreetMap, NASA FIRMS, Google Earth Engine."
  },
  tr: {
    notifications: "Bildirimler",
    telegramTitle: "Telegram uyarıları",
    telegramBody: "Anında kritik uyarılar.",
    telegramCta: "Botu aç",
    pushTitle: "Tarayıcı bildirimleri",
    pushBody: "Cihazda sessiz uyarılar.",
    follow: "Takip et",
    language: "Dil",
    references: "Kaynaklar",
    districts: "Tüm ilçeler",
    districtsBody: "Tam listeyi göz at.",
    about: "HazardSignal Hakkında",
    aboutBody: "Misyon, kapsam ve katkıda bulunanlar.",
    methodology: "Metodoloji",
    methodologyBody: "Riski nasıl ölçüyoruz.",
    legal: "Yasal",
    attribution: "Atıflar",
    attributionBody: "OpenStreetMap, NASA FIRMS, Google Earth Engine."
  }
};

const LOCALES = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" }
];

export default function MobileMoreContent({
  locale = "en",
  runDate = "-",
  telegramUrl = "https://t.me/HazardSignalBot"
}) {
  const router = useRouter();
  const c = COPY[locale] || COPY.en;

  return (
    <div className="m-more">
      <MobileBgParticles />
      <MobileTopBar tab="more" locale={locale} runDate={runDate} showScale={false} />

      <div className="m-more-scroll">
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
          <h3 className="m-more-section-title">{c.references}</h3>

          <Link className="m-more-row" href={"/" + locale + "/about"}>
            <span className="m-more-row-icon" data-tone="info">
              <MicroIcon name="info" />
            </span>
            <div className="m-more-row-body">
              <strong>{c.about}</strong>
              <span>{c.aboutBody}</span>
            </div>
          </Link>

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
              <MicroIcon name="satellite" />
            </span>
            <div className="m-more-row-body">
              <strong>{c.attribution}</strong>
              <span>{c.attributionBody}</span>
            </div>
          </div>
        </section>

        <section className="m-more-section m-more-follow-end">
          <h3 className="m-more-section-title">{c.follow}</h3>
          <div className="m-more-social-icons m-more-social-icons-row">
            <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="m-more-social-btn" aria-label="Instagram">
              <InstagramGlyph width="18" height="18" />
            </a>
            <a href={SOCIAL.facebook} target="_blank" rel="noreferrer" className="m-more-social-btn" aria-label="Facebook">
              <FacebookGlyph width="18" height="18" />
            </a>
            <a href={SOCIAL.x} target="_blank" rel="noreferrer" className="m-more-social-btn" aria-label="X (Twitter)">
              <XGlyph width="18" height="18" />
            </a>
          </div>
        </section>

        <p className="m-more-version">HazardSignal · v6.2.1</p>
      </div>
    </div>
  );
}
