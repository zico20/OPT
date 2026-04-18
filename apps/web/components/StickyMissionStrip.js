import MicroIcon from "./MicroIcon";

export default function StickyMissionStrip({ messages, state = "monitoring", focusLabel = "" }) {
  const mission = messages?.mission || {};
  const active = mission.states?.[state] || mission.states?.monitoring || { title: state };

  return (
    <div className={["mission-strip", `mission-strip-${state}`].filter(Boolean).join(" ")}>
      <div className="mission-strip-main">
        <MicroIcon name="mission" />
        <div className="mission-strip-copy">
          <span className="mission-strip-label">{mission.label || "Mission mode"}</span>
          <strong>{active.title}</strong>
        </div>
      </div>
      {focusLabel ? (
        <span className="mission-strip-focus">
          <span>{mission.focus || "Priority focus"}</span>
          <strong>{focusLabel}</strong>
        </span>
      ) : null}
    </div>
  );
}
