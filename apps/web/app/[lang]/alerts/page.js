import Link from "next/link";
import StickyMissionStrip from "../../../components/StickyMissionStrip";
import MissionStatus from "../../../components/MissionStatus";
import { getAlertEvents, getLatestRun } from "../../../lib/data";
import { formatPercent, formatProb, riskBadgeTone } from "../../../lib/format";
import { getMessages, localizeSeverity, normalizeLocale } from "../../../lib/i18n";
import { deriveMissionState } from "../../../lib/mission";

export default async function AlertsPage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const messages = getMessages(locale);

  const [latestRun, alerts] = await Promise.all([
    getLatestRun(),
    getAlertEvents()
  ]);

  const rows = alerts.slice(0, 40);
  const missionState = deriveMissionState({ latestRun, alerts: rows });
  const focusLabel = rows[0]?.district_name || "";
  const shellClass = ["shell", "mission-shell", "mission-" + missionState, messages.dir === "rtl" ? "rtl" : ""].filter(Boolean).join(" ");

  return (
    <div className={shellClass} dir={messages.dir}>
      <header className="masthead mission-header">
        <div className="hero-grid hero-grid-compact">
          <div className="hero-copy">
            <span className="eyebrow">{messages.alerts.eyebrow}</span>
            <h1>{messages.alerts.title}</h1>
            <p>{messages.alerts.intro}</p>
            <MissionStatus messages={messages} state={missionState} focusLabel={focusLabel} compact />
          </div>
        </div>
      </header>

      <StickyMissionStrip messages={messages} state={missionState} focusLabel={focusLabel} />

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>{messages.alerts.feedTitle}: {latestRun?.run_date || "-"}</h2>
        <div className="ops-table-wrap">
          {rows.length === 0 ? (
            <p className="muted">-</p>
          ) : (
            <table className="ops-table ops-table-alerts ops-mobile-feed">
              <thead>
                <tr>
                  <th>{messages.alerts.status}</th>
                  <th>{messages.home.district}</th>
                  <th>{messages.common.note}</th>
                  <th>{messages.alerts.maxProb}</th>
                  <th>{messages.alerts.highArea}</th>
                  <th>{messages.alerts.hotspots}</th>
                  <th>{messages.alerts.sent}</th>
                  <th>{messages.nav.dashboard}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((alert) => (
                  <tr key={alert.alert_id}>
                    <td data-label={messages.alerts.status}>
                      <div className={["badge", riskBadgeTone(alert.severity)].join(" ")}>
                        {localizeSeverity(alert.severity, locale)}
                      </div>
                    </td>
                    <td data-label={messages.home.district}>
                      <div className="ops-row-title">{alert.district_name}</div>
                      <div className="ops-row-sub">{alert.district_id}</div>
                    </td>
                    <td data-label={messages.common.note}>
                      <div className="ops-row-sub ops-wrap">{alert.trigger_reason}</div>
                    </td>
                    <td className="ops-number" data-label={messages.alerts.maxProb}>{formatProb(alert.max_fire_prob, locale)}</td>
                    <td className="ops-number" data-label={messages.alerts.highArea}>{formatPercent(alert.high_or_very_high_area_pct, locale)}</td>
                    <td className="ops-number" data-label={messages.alerts.hotspots}>{alert.hotspot_count_24h}</td>
                    <td data-label={messages.alerts.sent}>
                      <span className="ops-timestamp">{alert.sent_at || "-"}</span>
                    </td>
                    <td data-label={messages.nav.dashboard}>
                      <Link href={"/" + locale + "/districts/" + alert.district_id} className="ops-link-button">
                        {messages.home.district}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="panel footnote-panel" style={{ marginTop: 18 }}>
        <h3>{messages.common.note}</h3>
        <p className="footnote">{messages.common.decisionSupport}</p>
      </section>
    </div>
  );
}

