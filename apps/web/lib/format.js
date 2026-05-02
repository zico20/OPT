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
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "-";
  return `${formatNumber(num * 100, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}%`;
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

// Class label derived from max_fire_prob using the same break thresholds the
// classifier uses (0.2, 0.4, 0.6, 0.8). Use this whenever a UI surface shows
// max_fire_prob as its headline number — otherwise dominant_risk_class can
// disagree with the percent (e.g. "Very Low · 87% Max") because dominant_class
// is the *mode* across pixels while max_fire_prob is the single hottest pixel.
export function classFromMaxProb(prob) {
  const p = Number(prob || 0);
  if (p < 0.2) return "Very Low";
  if (p < 0.4) return "Low";
  if (p < 0.6) return "Medium";
  if (p < 0.8) return "High";
  return "Very High";
}
