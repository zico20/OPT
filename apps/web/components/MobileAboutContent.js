import MobileTopBar from "./MobileTopBar";
import MobileBgParticles from "./MobileBgParticles";

const COPY = {
  en: {
    eyebrow: "ABOUT",
    title: "HazardSignal",
    tagline: "Daily wildfire risk signals for the Antalya region.",
    statsDistricts: "Districts",
    statsAlerts: "Alerts (30d)",
    statsLastRun: "Last run",
    mission: "Mission",
    missionBody: "We combine satellite imagery, weather data, and machine learning to surface fire risk before ignition. Our goal: make signals reach the right people in time.",
    coverage: "Coverage",
    coverageBody: "All districts of Antalya, Turkey. Daily refresh, real-time hotspot ingestion.",
    sources: "Data sources",
    sourcesBody: "Sentinel-2, Landsat, FIRMS (VIIRS / MODIS), regional weather feeds.",
    methodCta: "Read the methodology",
    creditsTitle: "Built by",
    creditsBody: "Independent research project. Open about how the model works."
  },
  tr: {
    eyebrow: "HAKKINDA",
    title: "HazardSignal",
    tagline: "Antalya bölgesi için günlük orman yangını risk sinyalleri.",
    statsDistricts: "İlçe",
    statsAlerts: "Uyarı (30g)",
    statsLastRun: "Son güncelleme",
    mission: "Misyon",
    missionBody: "Uydu görüntüleri, hava verileri ve makine öğrenmesini birleştirerek yangın çıkmadan önce riski tespit ediyoruz.",
    coverage: "Kapsam",
    coverageBody: "Antalya'nın tüm ilçeleri. Günlük yenileme, gerçek zamanlı sıcak nokta tespiti.",
    sources: "Veri kaynakları",
    sourcesBody: "Sentinel-2, Landsat, FIRMS (VIIRS / MODIS), bölgesel hava verileri.",
    methodCta: "Metodolojiyi okuyun",
    creditsTitle: "Yapan",
    creditsBody: "Bağımsız araştırma projesi. Modelin nasıl çalıştığı konusunda açık."
  }
};

export default function MobileAboutContent({ locale = "en", runDate = "-", stats = null }) {
  const c = COPY[locale] || COPY.en;

  return (
    <div className="m-about">
      <MobileBgParticles />
      <MobileTopBar tab="about" locale={locale} runDate={runDate} showScale={false} />

      <div className="m-about-scroll">
        <section className="m-about-hero">
          <div className="m-about-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="72" height="72">
              <defs>
                <linearGradient id="hs-arc-mabout" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ff5a1f" />
                  <stop offset="100%" stopColor="#ff8a3d" />
                </linearGradient>
              </defs>
              <path d="M 8 42 A 24 24 0 0 1 56 42" fill="none" stroke="url(#hs-arc-mabout)" strokeWidth="3.2" strokeLinecap="round" opacity="0.95" />
              <path d="M 16 42 A 16 16 0 0 1 48 42" fill="none" stroke="url(#hs-arc-mabout)" strokeWidth="3.2" strokeLinecap="round" opacity="0.6" />
              <path d="M 23 42 A 9 9 0 0 1 41 42" fill="none" stroke="url(#hs-arc-mabout)" strokeWidth="3.2" strokeLinecap="round" opacity="0.3" />
              <circle cx="32" cy="42" r="3.4" fill="#ff8a3d" />
              <circle cx="32" cy="42" r="1.6" fill="#ffffff" opacity="0.95" />
            </svg>
          </div>
          <span className="m-about-eyebrow">{c.eyebrow}</span>
          <h1 className="m-about-title">Hazard<span className="m-about-title-accent">Signal</span></h1>
          <p className="m-about-tagline">{c.tagline}</p>
        </section>

        {stats && (
          <section className="m-about-stats">
            <div className="m-about-stat">
              <span className="m-about-stat-num">{stats.districts}</span>
              <span className="m-about-stat-label">{c.statsDistricts}</span>
            </div>
            <div className="m-about-stat">
              <span className="m-about-stat-num">{stats.alerts30d}</span>
              <span className="m-about-stat-label">{c.statsAlerts}</span>
            </div>
            <div className="m-about-stat">
              <span className="m-about-stat-num">{stats.runDate.slice(5) || "-"}</span>
              <span className="m-about-stat-label">{c.statsLastRun}</span>
            </div>
          </section>
        )}

        <section className="m-about-card">
          <h3 className="m-about-card-title">{c.mission}</h3>
          <p>{c.missionBody}</p>
        </section>

        <section className="m-about-card">
          <h3 className="m-about-card-title">{c.coverage}</h3>
          <p>{c.coverageBody}</p>
        </section>

        <section className="m-about-card">
          <h3 className="m-about-card-title">{c.sources}</h3>
          <p>{c.sourcesBody}</p>
        </section>

        <section className="m-about-card m-about-credits">
          <h3 className="m-about-card-title">{c.creditsTitle}</h3>
          <p>{c.creditsBody}</p>
        </section>
      </div>
    </div>
  );
}
