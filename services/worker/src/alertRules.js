export function severityFromDistrict(district, rules) {
  const hasHotspot = Number(district.hotspot_count_24h || 0) >= Number(rules.hotspot_count_critical_min || 1);
  const highArea = Number(district.high_or_very_high_area_pct || 0) >= Number(rules.high_or_very_high_area_pct_min || 10);
  const highProb = Number(district.max_fire_prob || 0) >= Number(rules.probability_warning_min || 0.7);
  const watchProb = Number(district.max_fire_prob || 0) >= Number(rules.probability_watch_min || 0.55);

  if (hasHotspot && (highArea || highProb)) {
    return "Critical";
  }

  if (highArea || highProb) {
    return "Warning";
  }

  if (watchProb) {
    return "Watch";
  }

  return null;
}

export function buildTriggerReason(district, severity) {
  if (severity === "Critical") {
    return "Active hotspot and high-risk classification";
  }

  if (severity === "Warning") {
    if (Number(district.hotspot_count_24h || 0) > 0) {
      return "Active hotspot detected";
    }
    if (Number(district.high_or_very_high_area_pct || 0) >= 10) {
      return "High-risk area percentage exceeded threshold";
    }
    return "Maximum fire probability exceeded warning threshold";
  }

  return "Probability entered watch range";
}

export function shouldSendAlert(district, rules) {
  const severity = severityFromDistrict(district, rules);
  if (!severity) {
    return null;
  }

  return {
    severity,
    trigger_reason: buildTriggerReason(district, severity)
  };
}

export function buildTelegramMessage({ runDate, district, appUrl, severity, triggerReason }) {
  return [
    `Fire Risk Alert - ${severity}`,
    `Date: ${runDate}`,
    `District: ${district.district_name}`,
    `Max probability: ${Number(district.max_fire_prob).toFixed(2)}`,
    `High/very-high area: ${Number(district.high_or_very_high_area_pct).toFixed(1)}%`,
    `Hotspots (24h): ${district.hotspot_count_24h}`,
    `Reason: ${triggerReason}`,
    `Dashboard: ${appUrl}`
  ].join("\n");
}

const SEVERITY_RANK = { Watch: 1, Warning: 2, Critical: 3 };
const SEVERITY_EMOJI = { Critical: "\u{1F534}", Warning: "\u{1F7E0}", Watch: "\u{1F7E1}" };

export function severityRank(severity) {
  return SEVERITY_RANK[severity] || 0;
}

export function hasEscalated(currentSeverity, previousSeverity) {
  return severityRank(currentSeverity) > severityRank(previousSeverity);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatDistrictLine(d) {
  const name = escapeHtml(d.district_name);
  const prob = Number(d.max_fire_prob || 0).toFixed(2);
  const hotspots = Number(d.hotspot_count_24h || 0);
  const hotspotPart = hotspots > 0 ? `, ${hotspots} hotspot${hotspots === 1 ? "" : "s"}` : "";
  return `   • <b>${name}</b> — prob ${prob}${hotspotPart}`;
}

export function buildCriticalMessage({ runDate, district, triggerReason, appUrl }) {
  const name = escapeHtml(district.district_name);
  const prob = Number(district.max_fire_prob || 0).toFixed(2);
  const areaPct = Number(district.high_or_very_high_area_pct || 0).toFixed(1);
  const hotspots = Number(district.hotspot_count_24h || 0);
  const reason = escapeHtml(triggerReason);
  const url = escapeHtml(appUrl || "");

  return [
    `\u{1F6A8} <b>CRITICAL FIRE ALERT</b>`,
    `\u{1F4CD} District: <b>${name}</b>`,
    `\u{1F4C5} Date: ${runDate}`,
    ``,
    `\u{1F525} Max probability: <b>${prob}</b>`,
    `\u{1F4CA} High-risk area: ${areaPct}%`,
    `\u{1F6F0} Hotspots (24h): ${hotspots}`,
    ``,
    `<i>${reason}</i>`,
    ``,
    `\u{1F517} <a href="${url}">Open dashboard</a>`
  ].join("\n");
}

/**
 * alerts: [{ severity, district, triggerReason }]
 * cleared: [{ district }]
 */
export function buildDigestMessage({ runDate, alerts, cleared = [], appUrl }) {
  const grouped = { Critical: [], Warning: [], Watch: [] };
  for (const a of alerts) grouped[a.severity]?.push(a);

  const lines = [
    `\u{1F525} <b>HazardSignal — Daily Risk Digest</b>`,
    `\u{1F4C5} ${runDate}`,
    ``
  ];

  for (const sev of ["Critical", "Warning", "Watch"]) {
    const list = grouped[sev];
    if (!list || list.length === 0) continue;
    lines.push(`${SEVERITY_EMOJI[sev]} <b>${sev}</b> (${list.length} new)`);
    for (const a of list) lines.push(formatDistrictLine(a.district));
    lines.push("");
  }

  if (cleared.length > 0) {
    lines.push(`✅ <b>All Clear</b> (${cleared.length})`);
    for (const c of cleared) lines.push(`   • ${escapeHtml(c.district.district_name)}`);
    lines.push("");
  }

  lines.push(`\u{1F517} <a href="${escapeHtml(appUrl || "")}">Open dashboard</a>`);
  return lines.join("\n");
}

