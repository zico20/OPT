import StickyMissionStrip from "../../../components/StickyMissionStrip";
import MissionStatus from "../../../components/MissionStatus";
import { getActiveFireDaily, getAlertEvents, getLatestRun } from "../../../lib/data";
import { getMessages, normalizeLocale } from "../../../lib/i18n";
import { deriveMissionState } from "../../../lib/mission";

export default async function MethodologyPage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const messages = getMessages(locale);

  const [latestRun, fires, alerts] = await Promise.all([
    getLatestRun(),
    getActiveFireDaily(),
    getAlertEvents()
  ]);

  const missionState = deriveMissionState({ latestRun, fires, alerts });
  const focusLabel = fires[0]?.district_name || alerts[0]?.district_name || "";
  const shellClass = ["shell", "mission-shell", "mission-" + missionState, messages.dir === "rtl" ? "rtl" : ""].filter(Boolean).join(" ");

  return (
    <div className={shellClass} dir={messages.dir}>
      <header className="masthead mission-header">
        <div className="hero-grid hero-grid-compact">
          <div className="hero-copy">
            <span className="eyebrow">{messages.methodology.eyebrow}</span>
            <h1>{messages.methodology.title}</h1>
            <p>{messages.methodology.intro}</p>
            <MissionStatus messages={messages} state={missionState} focusLabel={focusLabel} compact />
          </div>
        </div>
      </header>

      <StickyMissionStrip messages={messages} state={missionState} focusLabel={focusLabel} />

      <section className="methodology-grid" style={{ marginTop: 18 }}>
        <article className="panel methodology-card">
          <span className="eyebrow">{messages.methodology.inputsTitle}</span>
          <h2>{messages.methodology.inputsTitle}</h2>
          <p>{messages.methodology.inputsLead}</p>
          <div className="feature-list">
            <div className="feature-item">{messages.methodology.input1}</div>
            <div className="feature-item">{messages.methodology.input2}</div>
            <div className="feature-item">{messages.methodology.input3}</div>
          </div>
        </article>

        <article className="panel methodology-card">
          <span className="eyebrow">{messages.methodology.probabilityTitle}</span>
          <h2>{messages.methodology.probabilityTitle}</h2>
          <p>{messages.methodology.probabilityLead}</p>
          <div className="feature-list">
            <div className="feature-item">{messages.methodology.probability1}</div>
            <div className="feature-item">{messages.methodology.probability2}</div>
            <div className="feature-item">{messages.methodology.probability3}</div>
          </div>
        </article>

        <article className="panel methodology-card methodology-alert-card">
          <span className="eyebrow">{messages.methodology.notTitle}</span>
          <h2>{messages.methodology.notTitle}</h2>
          <p>{messages.methodology.notLead}</p>
          <div className="feature-list">
            <div className="feature-item">{messages.methodology.not1}</div>
            <div className="feature-item">{messages.methodology.not2}</div>
            <div className="feature-item">{messages.methodology.not3}</div>
          </div>
        </article>
      </section>

      <section className="panel footnote-panel" style={{ marginTop: 18 }}>
        <h3>{messages.methodology.noteTitle}</h3>
        <p className="footnote">{messages.common.decisionSupport}</p>
      </section>
    </div>
  );
}

