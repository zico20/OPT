import { MISSION_SEQUENCE } from "../lib/mission";

export default function MissionStatus({ messages, state = "monitoring", focusLabel = "", compact = false }) {
  const missionMessages = messages?.mission || {};
  const states = missionMessages.states || {};
  const active = states[state] || states.monitoring || { title: state, body: "" };

  return (
    <section className={`mission-status mission-${state} ${compact ? "compact" : ""}`.trim()}>
      <div className="mission-rail" aria-label={missionMessages.label || "Mission mode"}>
        {MISSION_SEQUENCE.map((entry) => {
          const item = states[entry] || { title: entry };
          return (
            <span
              key={entry}
              className={`mission-chip ${entry === state ? "active" : ""}`.trim()}
            >
              {item.title}
            </span>
          );
        })}
      </div>

      <div className="mission-brief">
        <span className="mission-kicker">{missionMessages.label || "Mission mode"}</span>
        <strong>{active.title}</strong>
        <p>{active.body}</p>
        {focusLabel ? (
          <span className="mission-focus">
            {missionMessages.focus || "Priority focus"}: {focusLabel}
          </span>
        ) : null}
      </div>
    </section>
  );
}

