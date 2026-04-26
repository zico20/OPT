import Link from "next/link";
import MobileTopBar from "./MobileTopBar";

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
  ar: {
    eyebrow: "حول",
    title: "HazardSignal",
    tagline: "إشارات يومية لخطر الحرائق في إقليم أنطاليا.",
    statsDistricts: "مناطق",
    statsAlerts: "تنبيهات (30ي)",
    statsLastRun: "آخر تشغيل",
    mission: "المهمّة",
    missionBody: "ندمج صور الأقمار، بيانات الطقس، وتعلّم الآلة لكشف خطر الحريق قبل اندلاعه. هدفنا: إيصال الإشارة للناس في الوقت المناسب.",
    coverage: "التغطية",
    coverageBody: "كل مناطق إقليم أنطاليا في تركيا. تحديث يومي وبيانات نقاط ساخنة لحظية.",
    sources: "مصادر البيانات",
    sourcesBody: "Sentinel-2، Landsat، FIRMS (VIIRS / MODIS)، بيانات طقس إقليمية.",
    methodCta: "اقرأ المنهجية",
    creditsTitle: "مَن وراء المشروع",
    creditsBody: "مشروع بحثي مستقل. شفّاف حول كيفية عمل النموذج."
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
      <MobileTopBar tab="about" locale={locale} runDate={runDate} showScale={false} />

      <div className="m-about-scroll">
        <section className="m-about-hero">
          <div className="m-about-mark" aria-hidden="true">
            <svg viewBox="0 0 512 512" width="64" height="64">
              <path d="M150 220C150 140 210 100 256 100C302 100 362 140 362 220" stroke="#FF5F1F" strokeWidth="35" strokeLinecap="round" fill="none"/>
              <path d="M190 270C190 230 225 210 256 210C287 210 322 230 322 270V310C322 350 287 380 256 380C225 380 190 350 190 310" stroke="#FF5F1F" strokeWidth="30" strokeLinecap="round" fill="none"/>
              <path d="M256 270L280 320C280 320 256 345 256 345C256 345 232 320 232 320L256 270Z" fill="#FF3131"/>
            </svg>
          </div>
          <span className="m-about-eyebrow">{c.eyebrow}</span>
          <h1 className="m-about-title">{c.title}</h1>
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

        <Link className="m-about-cta" href={"/" + locale + "/methodology"}>
          {c.methodCta} →
        </Link>

        <section className="m-about-card m-about-credits">
          <h3 className="m-about-card-title">{c.creditsTitle}</h3>
          <p>{c.creditsBody}</p>
        </section>
      </div>
    </div>
  );
}
