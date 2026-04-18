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

