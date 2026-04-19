"use client";

function sevColor(s) {
  if (s === "Critical" || s === "critical") return "#E52211";
  if (s === "Warning" || s === "warning") return "#FF7A18";
  return "#D4A820";
}

function iconFor(sev) {
  if (sev === "Critical" || sev === "critical") return "🔥";
  if (sev === "Warning" || sev === "warning") return "⚑";
  return "ℹ";
}

function timeLabel(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

export default function MobileAlertsV2({ alerts = [], latestRun, messages }) {
  const rows = alerts.slice(0, 30);
  const count = (sev) => rows.filter((a) => (a.severity || "").toLowerCase() === sev).length;

  return (
    <div className="hsv2-screen hsv2-alerts">
      <div className="hsv2-header hsv2-header-full">
        <div>
          <div className="hsv2-eyebrow">{messages?.alerts?.eyebrow || "Past 7 days"}</div>
          <div className="hsv2-title-big">{messages?.alerts?.title || "Alerts"}</div>
        </div>
      </div>

      <div className="hsv2-summary">
        <div className="hsv2-summary-cell">
          <div className="hsv2-summary-n" style={{ color: "#E52211" }}>{count("critical")}</div>
          <div className="hsv2-summary-l">Critical</div>
        </div>
        <div className="hsv2-summary-cell">
          <div className="hsv2-summary-n" style={{ color: "#FF7A18" }}>{count("warning")}</div>
          <div className="hsv2-summary-l">Warning</div>
        </div>
        <div className="hsv2-summary-cell">
          <div className="hsv2-summary-n">{count("info")}</div>
          <div className="hsv2-summary-l">Info</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="hsv2-empty">No alerts for run {latestRun?.run_date || "-"}</div>
      ) : (
        rows.map((a) => (
          <div
            key={a.alert_id}
            className={["hsv2-alert", (a.severity || "").toLowerCase() === "critical" ? "critical" : ""].filter(Boolean).join(" ")}
          >
            <div
              className="hsv2-alert-icon"
              style={{ background: sevColor(a.severity) + "22", color: sevColor(a.severity) }}
            >
              {iconFor(a.severity)}
            </div>
            <div className="hsv2-alert-body">
              <div className="hsv2-alert-top">
                <div className="hsv2-alert-title">{a.district_name}</div>
                <div className="hsv2-alert-time">{timeLabel(a.sent_at)}</div>
              </div>
              <div className="hsv2-alert-desc">{a.trigger_reason || "-"}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
