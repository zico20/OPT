import Link from "next/link";
import LocaleSwitch from "../../../../components/LocaleSwitch";
import StickyMissionStrip from "../../../../components/StickyMissionStrip";
import MissionStatus from "../../../../components/MissionStatus";
import TelegramSubscribePanel from "../../../../components/TelegramSubscribePanel";
import { getAlertEvents, getDistrictById, getDistrictHistory } from "../../../../lib/data";
import { formatPercent, formatProb, riskBadgeTone } from "../../../../lib/format";
import { getMessages, localizeRiskClass, localizeSeverity, normalizeLocale } from "../../../../lib/i18n";
import { deriveMissionState } from "../../../../lib/mission";

export default async function DistrictPage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const districtId = resolvedParams.districtId;
  const messages = getMessages(locale);

  const [district, history, alerts] = await Promise.all([
    getDistrictById(districtId),
    getDistrictHistory(districtId),
    getAlertEvents()
  ]);

  if (!district) {
    return (
      <div className={["shell", messages.dir === "rtl" ? "rtl" : ""].filter(Boolean).join(" ")} dir={messages.dir}>
        <section className="panel">
          <h2>{messages.common.notFound}</h2>
          <div style={{ marginTop: 14 }}>
            <Link href={"/" + locale} className="button">
              {messages.common.back}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const relatedAlerts = alerts.filter((item) => item.district_id === districtId).slice(0, 20);
  const missionState = deriveMissionState({ district, alerts: relatedAlerts });
  const focusLabel = district.district_name;
  const shellClass = ["shell", "mission-shell", "mission-" + missionState, messages.dir === "rtl" ? "rtl" : ""].filter(Boolean).join(" ");

  return (
    <div className={shellClass} dir={messages.dir}>
      <header className="masthead mission-header">
        <div className="hero-grid hero-grid-compact">
          <div className="hero-copy">
            <span className="eyebrow">{messages.district.eyebrow}</span>
            <h1>{district.district_name}</h1>
            <p>{messages.district.intro}</p>
            <MissionStatus messages={messages} state={missionState} focusLabel={district.district_name} compact />

            <div className="topnav public-topnav">
              <Link href={"/" + locale}>{messages.common.back}</Link>
              <Link className="secondary" href={"/" + locale + "/alerts"}>
                {messages.nav.alerts}
              </Link>
              <Link className="secondary" href={"/" + locale + "/methodology"}>
                {messages.nav.methodology}
              </Link>
            </div>
          </div>

          <TelegramSubscribePanel
            messages={messages}
            title={messages.common.subscribeTelegram}
            body={messages.common.subscribeHint}
            compact
            buttonOnly
          />
        </div>

        <LocaleSwitch locale={locale} path={"/districts/" + districtId} locales={messages.locales} className="public-locale-switch" />
      </header>

      <StickyMissionStrip messages={messages} state={missionState} focusLabel={focusLabel} />

      <section className="hero-stats compact-stats" style={{ marginTop: 18 }}>
        <article className="stat-card stat-card-compact">
          <div className="stat-label">{messages.district.dominantClass}</div>
          <div className="stat-value stat-value-compact">{localizeRiskClass(district.dominant_risk_class, locale)}</div>
        </article>
        <article className="stat-card stat-card-compact">
          <div className="stat-label">{messages.district.maxProb}</div>
          <div className="stat-value stat-value-compact">{formatProb(district.max_fire_prob, locale)}</div>
        </article>
        <article className="stat-card stat-card-compact">
          <div className="stat-label">{messages.district.highArea}</div>
          <div className="stat-value stat-value-compact">{formatPercent(district.high_or_very_high_area_pct, locale)}</div>
        </article>
        <article className="stat-card stat-card-compact">
          <div className="stat-label">{messages.district.hotspots24h}</div>
          <div className="stat-value stat-value-compact">{district.hotspot_count_24h}</div>
        </article>
      </section>

      <section className="split split-feed" style={{ marginTop: 18 }}>
        <article className="panel district-table ops-table-panel">
          <h3>{messages.district.history}</h3>
          <div className="ops-table-wrap">
            <table className="ops-table ops-mobile-feed">
              <thead>
                <tr>
                  <th>{messages.district.date}</th>
                  <th>{messages.district.meanRisk}</th>
                  <th>{messages.district.maxProb}</th>
                  <th>{messages.district.highArea}</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4}>-</td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={districtId + "-" + row.run_date}>
                      <td data-label={messages.district.date}>{row.run_date}</td>
                      <td className="ops-number" data-label={messages.district.meanRisk}>{formatProb(row.mean_risk, locale)}</td>
                      <td className="ops-number" data-label={messages.district.maxProb}>{formatProb(row.max_fire_prob, locale)}</td>
                      <td className="ops-number" data-label={messages.district.highArea}>{formatPercent(row.high_or_very_high_area_pct, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel ops-table-panel">
          <h3>{messages.district.related}</h3>
          {relatedAlerts.length === 0 ? (
            <p className="muted">{messages.district.noAlerts}</p>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table ops-table-alerts ops-mobile-feed">
                <thead>
                  <tr>
                    <th>{messages.alerts.status}</th>
                    <th>{messages.common.note}</th>
                    <th>{messages.district.probability}</th>
                    <th>{messages.district.area}</th>
                    <th>{messages.district.hotspots}</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedAlerts.map((alert) => (
                    <tr key={alert.alert_id}>
                      <td data-label={messages.alerts.status}>
                        <div className={["badge", riskBadgeTone(alert.severity)].join(" ")}>
                          {localizeSeverity(alert.severity, locale)}
                        </div>
                      </td>
                      <td data-label={messages.common.note}>
                        <div className="ops-row-sub ops-wrap">{alert.trigger_reason}</div>
                      </td>
                      <td className="ops-number" data-label={messages.district.probability}>{formatProb(alert.max_fire_prob, locale)}</td>
                      <td className="ops-number" data-label={messages.district.area}>{formatPercent(alert.high_or_very_high_area_pct, locale)}</td>
                      <td className="ops-number" data-label={messages.district.hotspots}>{alert.hotspot_count_24h}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="panel footnote-panel" style={{ marginTop: 18 }}>
        <h3>{messages.common.note}</h3>
        <p className="footnote">{messages.common.decisionSupport}</p>
      </section>
    </div>
  );
}

