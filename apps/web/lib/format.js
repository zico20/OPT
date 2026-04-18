function normalizeLocale(locale) {
  const safe = String(locale || "en").toLowerCase();
  if (safe === "ar" || safe === "tr" || safe === "en") {
    return safe;
  }
  return "en";
}

function formatNumber(value, locale, options) {
  const safeLocale = normalizeLocale(locale);
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  return new Intl.NumberFormat(safeLocale, options).format(safeValue);
}

export function formatPercent(value, locale = "en") {
  return `${formatNumber(value, locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`;
}

export function formatProb(value, locale = "en") {
  return formatNumber(value, locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function riskBadgeTone(label) {
  if (label === "Very High" || label === "Critical") {
    return "critical";
  }
  if (label === "High" || label === "Warning") {
    return "warning";
  }
  return "watch";
}

export function severityColor(severity) {
  if (severity === "Critical") {
    return "#f43f5e";
  }
  if (severity === "Warning") {
    return "#f97316";
  }
  return "#14b8a6";
}
