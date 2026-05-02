import Link from "next/link";
import LocaleSwitch from "../../components/LocaleSwitch";
import MicroIcon from "../../components/MicroIcon";
import StickyMissionStrip from "../../components/StickyMissionStrip";
import MissionStatus from "../../components/MissionStatus";
import RiskMapShell from "../../components/RiskMapShell";
import TelegramSubscribePanel from "../../components/TelegramSubscribePanel";
import InsightCarousel from "../../components/InsightCarousel";
import LastUpdatedBadge from "../../components/LastUpdatedBadge";
import PushSubscribeButton from "../../components/PushSubscribeButton";
import WeatherStrip from "../../components/WeatherStrip";
import MobileMapConsole from "../../components/MobileMapConsole";
import PublicTopNav from "../../components/PublicTopNav";
import DesktopHeroV2 from "../../components/DesktopHeroV2";
import {
  getActiveFireDaily,
  getAlertEvents,
  getAlertRules,
  getDistrictRiskDaily,
  getLatestRun,
  getWeatherData,
  deriveOperationalSeverity,
  sortDistrictsForOperations
} from "../../lib/data";
import { formatPercent, formatProb, riskBadgeTone } from "../../lib/format";
import { getMessages, localizeRiskClass, localizeSeverity, normalizeLocale } from "../../lib/i18n";
import { deriveMissionState } from "../../lib/mission";
import { getTelegramSubscribeUrl } from "../../lib/publicLinks";

export default async function DashboardPage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const messages = getMessages(locale);

  const [latestRun, districtRows, fires, alerts, rules, weather] = await Promise.all([
    getLatestRun(),
    getDistrictRiskDaily(),
    getActiveFireDaily(),
    getAlertEvents(),
    getAlertRules(),
    getWeatherData()
  ]);

  const districts = sortDistrictsForOperations(districtRows, rules).map((district) => ({
    ...district,
    operational_severity: deriveOperationalSeverity(district, rules)
  }));
  const topDistricts = districts.slice(0, 8);
  const recentAlerts = alerts.slice(0, 8);
  const missionState = deriveMissionState({ latestRun, districts, fires, alerts: recentAlerts });

  const runDate = latestRun?.run_date || "-";
  const selectedThreshold = latestRun ? formatProb(latestRun.selected_threshold, locale) : "-";
  const criticalDistricts = latestRun?.critical_districts ?? 0;
  const activeFireDistricts = latestRun?.active_fire_districts ?? 0;
  const highestArea = districts[0]?.high_or_very_high_area_pct ?? 0;
  const peakProbability = districts.reduce((max, district) => Math.max(max, district.max_fire_prob ?? 0), 0);
  const focusLabel = fires[0]?.district_name || topDistricts[0]?.district_name || "";
  const missionTitle = messages?.mission?.states?.[missionState]?.title || missionState;
  const warningDistrictCount = districts.filter((district) => ["warning", "critical"].includes(district.operational_severity)).length;
  const subscribeUrl = getTelegramSubscribeUrl();
  const workflowStates = ["monitoring", "escalation", "incident"].map((entry, index) => ({
    id: entry,
    step: String(index + 1).padStart(2, "0"),
    ...messages.mission.states[entry]
  }));

  const shellClass = [
    "shell",
    "home-shell",
    "mission-shell",
    "mission-" + missionState,
    messages.dir === "rtl" ? "rtl" : ""
  ].filter(Boolean).join(" ");

  const snapshotCards = [
    { label: messages.home.threshold, value: selectedThreshold },
    { label: messages.alerts.status, value: latestRun?.status || "-" },
    { label: messages.home.highArea, value: formatPercent(highestArea, locale) },
    { label: messages.mission?.focus || missionTitle, value: focusLabel || missionTitle || "-" }
  ];

  return (
    <div className={shellClass} dir={messages.dir}>
      <div className="m-route-mobile-only">
        <MobileMapConsole
          districts={districts}
          fires={fires}
          messages={messages}
          locale={locale}
          missionState={missionState}
          criticalDistricts={criticalDistricts}
          activeFireDistricts={activeFireDistricts}
          peakProbability={peakProbability}
          runDate={runDate}
          weather={weather}
        />
      </div>

      <div className="m-route-desktop-only">
      <header className="masthead mission-header">
        <PublicTopNav locale={locale} messages={messages} currentPath="/" />

        <DesktopHeroV2
          missionState={missionState}
          missionTitle={missionTitle}
          missionBody={messages.mission?.states?.[missionState]?.body}
          focusLabel={focusLabel}
          peakProbability={peakProbability}
          highRiskArea={highestArea}
          criticalDistricts={criticalDistricts}
          activeFireDistricts={activeFireDistricts}
          hotspotCount={fires.length}
          selectedThresholdRaw={latestRun?.selected_threshold}
          runDate={runDate}
          latestRun={latestRun}
          weather={weather}
          districts={districts}
          totalDistricts={districts.length || 19}
        />
      </header>

      <StickyMissionStrip messages={messages} state={missionState} focusLabel={focusLabel} />

      <section className="section-grid story-grid" style={{ marginTop: 18 }}>
        <article className="panel story-brief-panel" style={{ gridColumn: "span 7" }}>
          <InsightCarousel
            locale={locale}
            messages={messages}
            missionState={missionState}
            missionTitle={missionTitle}
            focusLabel={focusLabel}
            warningDistrictCount={warningDistrictCount}
            highestAreaRaw={highestArea}
            highestAreaValue={formatPercent(highestArea, locale)}
            activeFireDistricts={activeFireDistricts}
            criticalDistricts={criticalDistricts}
            runDate={runDate}
            selectedThreshold={selectedThreshold}
            peakProbabilityRaw={peakProbability}
            peakProbabilityValue={formatProb(peakProbability, locale)}
            workflowStates={workflowStates}
            subscribeUrl={subscribeUrl}
            recentAlertCount={recentAlerts.length}
          />
        </article>

        <aside className="panel story-tools-panel" style={{ gridColumn: "span 5" }}>
          <span className="eyebrow">{messages.home.toolsEyebrow}</span>
          <h3>{messages.home.toolsTitle}</h3>
          <p>{messages.home.toolsBody}</p>

          <div className="feature-list">
            <div className="feature-item">
              <strong>{messages.home.toolMapTitle}</strong>
              <span>{messages.home.toolMapBody}</span>
            </div>
            <div className="feature-item">
              <strong>{messages.home.toolBoardTitle}</strong>
              <span>{messages.home.toolBoardBody}</span>
            </div>
            <div className="feature-item">
              <strong>{messages.home.toolMethodTitle}</strong>
              <span>{messages.home.toolMethodBody}</span>
            </div>
          </div>

          <TelegramSubscribePanel
            messages={messages}
            title={messages.home.subscriptionTitle}
            body={messages.home.subscriptionBody}
            compact
          />
        </aside>
      </section>

      <section className="section-grid narrative-grid" style={{ marginTop: 18 }}>
        <article className="panel narrative-panel" style={{ gridColumn: "span 12" }}>
          <div className="narrative-head">
            <div>
              <span className="eyebrow">{messages.home.workflowEyebrow}</span>
              <h2>{messages.home.workflowTitle}</h2>
            </div>
            <p>{messages.home.workflowBody}</p>
          </div>

          <div className="story-stage-grid">
            {workflowStates.map((state) => (
              <article key={state.id} className={["story-stage-card", "stage-" + state.id].join(" ")}>
                <span className="stage-step">{state.step}</span>
                <h3>{state.title}</h3>
                <p>{state.body}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="section-grid mobile-dashboard-sections">
        <aside className="panel snapshot-panel" style={{ gridColumn: "span 4" }}>
          <h3>{messages.home.snapshot}</h3>
          <div className="snapshot-grid">
            {snapshotCards.map((entry) => (
              <article className="snapshot-tile" key={entry.label}>
                <span className="snapshot-label">{entry.label}</span>
                <strong className="snapshot-value">{entry.value}</strong>
              </article>
            ))}
          </div>

          <div className="snapshot-note">
            <span className="eyebrow">{messages.common.note}</span>
            <p>{messages.common.decisionSupport}</p>
            <Link className="button secondary" href={"/" + locale + "/methodology"}>
              {messages.nav.methodology}
            </Link>
          </div>
        </aside>
      </section>

      <section className="split split-feed" style={{ marginTop: 18 }}>
        <article className="panel district-table ops-table-panel">
          <h3>{messages.home.leaderboard}</h3>
          <div className="ops-table-wrap">
            <table className="ops-table ops-mobile-feed">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{messages.home.district}</th>
                  <th>{messages.alerts.status}</th>
                  <th>{messages.home.highArea}</th>
                  <th>{messages.home.maxProb}</th>
                  <th>{messages.home.hotspots}</th>
                  {weather?.tomorrow?.date && <th className="ops-forecast-col">Tomorrow</th>}
                </tr>
              </thead>
              <tbody>
                {topDistricts.map((district, index) => {
                  const p = district.max_fire_prob ?? 0;
                  const tier = p >= 0.8 ? "extreme" : p >= 0.6 ? "very-high" : p >= 0.4 ? "high" : p >= 0.2 ? "moderate" : "low";
                  return (
                  <tr key={district.district_id} data-peak-tier={tier}>
                    <td data-label="#">
                      <span className="ops-index">{String(index + 1).padStart(2, "0")}</span>
                    </td>
                    <td className="ops-mobile-district-cell" data-label={messages.home.district}>
                      <div className="ops-row-title">
                        <Link href={"/" + locale + "/districts/" + district.district_id}>{district.district_name}</Link>
                      </div>
                      <div className="ops-row-sub">
                        {messages.home.classLabel}: {localizeRiskClass(district.dominant_risk_class, locale)}
                      </div>
                    </td>
                    <td data-label={messages.alerts.status}>
                      {district.operational_severity ? (
                        <span className={["badge", riskBadgeTone(district.operational_severity)].join(" ")}>
                          {localizeSeverity(district.operational_severity, locale)}
                        </span>
                      ) : (
                        <span className="ops-row-sub">-</span>
                      )}
                    </td>
                    <td className="ops-number" data-label={messages.home.highArea}>{formatPercent(district.high_or_very_high_area_pct, locale)}</td>
                    <td className="ops-number" data-label={messages.home.maxProb}>{formatProb(district.max_fire_prob, locale)}</td>
                    <td className="ops-number" data-label={messages.home.hotspots}>{district.hotspot_count_24h}</td>
                    {weather?.tomorrow?.date && (
                      <td className="ops-number ops-forecast-col" data-label="Tomorrow">
                        {district.forecast_max_fire_prob != null ? (
                          <span className={
                            district.forecast_max_fire_prob > district.max_fire_prob + 0.05 ? "forecast-up" :
                            district.forecast_max_fire_prob < district.max_fire_prob - 0.05 ? "forecast-down" :
                            "forecast-flat"
                          }>
                            {formatProb(district.forecast_max_fire_prob, locale)}
                            {district.forecast_max_fire_prob > district.max_fire_prob + 0.05 ? " ↑" :
                             district.forecast_max_fire_prob < district.max_fire_prob - 0.05 ? " ↓" : ""}
                          </span>
                        ) : "-"}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel alert-list ops-feed-panel feed-panel-mobile" id="recent-alert-feed">
          <h3>{messages.home.feed}</h3>
          {recentAlerts.length === 0 ? (
            <p className="muted">-</p>
          ) : (
            recentAlerts.map((alert) => (
              <div className="ops-event-card" key={alert.alert_id}>
                <div className="ops-event-head">
                  <div>
                    <div className="ops-row-title">{alert.district_name}</div>
                    <div className="ops-row-sub">{alert.trigger_reason}</div>
                  </div>
                  <div className={["badge", riskBadgeTone(alert.severity)].join(" ")}>
                    {localizeSeverity(alert.severity, locale)}
                  </div>
                </div>
                <div className="ops-metric-strip">
                  <span className="pill">{messages.home.probability}: {formatProb(alert.max_fire_prob, locale)}</span>
                  <span className="pill">{messages.home.area}: {formatPercent(alert.high_or_very_high_area_pct, locale)}</span>
                  <span className="pill">{messages.home.hotspots}: {alert.hotspot_count_24h}</span>
                </div>
              </div>
            ))
          )}
        </article>
      </section>

      <section className="panel footnote-panel" style={{ marginTop: 18 }}>
        <h3>{messages.common.note}</h3>
        <p className="muted">{messages.alerts.noteBody}</p>
        <p className="footnote">{messages.common.decisionSupport}</p>
      </section>
      </div>
    </div>
  );
}



