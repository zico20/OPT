import StickyMissionStrip from "../../../components/StickyMissionStrip";
import MissionStatus from "../../../components/MissionStatus";
import RiskMapShell from "../../../components/RiskMapShell";
import {
  getActiveFireDaily,
  getAlertEvents,
  getDistrictRiskDaily,
  getLatestRun,
  getAlertRules,
  deriveOperationalSeverity,
  sortDistrictsForOperations
} from "../../../lib/data";
import { formatPercent, formatProb } from "../../../lib/format";
import { getMessages, normalizeLocale } from "../../../lib/i18n";
import { deriveMissionState } from "../../../lib/mission";

export default async function MapPage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const messages = getMessages(locale);

  const [latestRun, districtRows, fires, alerts, rules] = await Promise.all([
    getLatestRun(),
    getDistrictRiskDaily(),
    getActiveFireDaily(),
    getAlertEvents(),
    getAlertRules()
  ]);

  const districts = sortDistrictsForOperations(districtRows, rules).map((district) => ({
    ...district,
    operational_severity: deriveOperationalSeverity(district, rules)
  }));

  const missionState = deriveMissionState({ latestRun, districts, fires, alerts });
  const focusLabel = fires[0]?.district_name || districts[0]?.district_name || "";
  const shellClass = ["shell", "mission-shell", "mission-" + missionState, messages.dir === "rtl" ? "rtl" : ""].filter(Boolean).join(" ");

  const stats = [
    { label: messages.home.lastRun, value: latestRun?.run_date || "-" },
    { label: messages.home.hotspots, value: String(latestRun?.active_fire_districts ?? 0) },
    { label: messages.home.criticalDistricts, value: String(latestRun?.critical_districts ?? 0) },
    { label: messages.home.highArea, value: formatPercent(districts[0]?.high_or_very_high_area_pct ?? 0, locale) },
    { label: messages.home.maxProb, value: formatProb(districts.reduce((max, district) => Math.max(max, district.max_fire_prob ?? 0), 0), locale) }
  ];

  return (
    <div className={shellClass} dir={messages.dir}>
      <header className="masthead mission-header">
        <div className="hero-grid hero-grid-compact map-page-hero">
          <div className="hero-copy">
            <span className="eyebrow">{messages.home.mapTitle}</span>
            <h1>{messages.home.mapTitle}</h1>
            <p>{messages.home.mapDesc}</p>
            <MissionStatus messages={messages} state={missionState} focusLabel={focusLabel} compact />
          </div>
        </div>
      </header>

      <StickyMissionStrip messages={messages} state={missionState} focusLabel={focusLabel} />

      <section className="panel map-page-panel" style={{ marginTop: 18 }}>
        <div className="map-page-shell">
          <RiskMapShell districts={districts} fires={fires} messages={messages.map} locale={locale} missionState={missionState} />
        </div>
      </section>

      <section className="panel map-page-stats" style={{ marginTop: 18 }}>
        <div className="map-page-stat-grid">
          {stats.map((entry) => (
            <article className="map-page-stat-card" key={entry.label}>
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
