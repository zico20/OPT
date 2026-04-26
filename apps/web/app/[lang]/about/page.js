import Link from "next/link";
import MobileAboutContent from "../../../components/MobileAboutContent";
import PublicTopNav from "../../../components/PublicTopNav";
import { getLatestRun, getDistrictRiskDaily, getAlertEvents } from "../../../lib/data";
import { getMessages, normalizeLocale } from "../../../lib/i18n";

export default async function AboutPage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const messages = getMessages(locale);
  const [latestRun, districts, alerts] = await Promise.all([
    getLatestRun(),
    getDistrictRiskDaily(),
    getAlertEvents()
  ]);

  const stats = {
    districts: districts.length,
    alerts30d: alerts.filter((a) => {
      const t = a.sent_at ? new Date(a.sent_at).getTime() : 0;
      return t && Date.now() - t < 30 * 86400000;
    }).length,
    runDate: latestRun?.run_date || "-"
  };

  const shellClass = ["shell", messages.dir === "rtl" ? "rtl" : ""].filter(Boolean).join(" ");

  return (
    <div className={shellClass} dir={messages.dir}>
      <div className="m-route-mobile-only">
        <MobileAboutContent locale={locale} runDate={latestRun?.run_date || "-"} stats={stats} />
      </div>

      <div className="m-route-desktop-only">
        <header className="masthead">
          <PublicTopNav locale={locale} messages={messages} currentPath="/about" />
        </header>
        <section className="panel" style={{ marginTop: 18 }}>
          <h1>About HazardSignal</h1>
          <p>HazardSignal is an operational platform delivering daily wildfire-risk signals for the Antalya region.</p>
          <p>
            <Link className="button secondary" href={"/" + locale + "/methodology"}>Read the methodology →</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
