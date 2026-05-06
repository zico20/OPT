// askTools.js — function implementations for the Ask AI chatbot.
//
// Each export pairs with a Claude tool definition (see app/api/ask/route.js).
// The tools are deliberately thin wrappers around lib/data.js so the chatbot
// can never see anything the public dashboard can't.
//
// Returning serializable plain objects only — no functions, no class
// instances. Anthropic's tool_result expects JSON-stringifiable content.

import {
  getDistrictRiskDaily,
  getActiveFireDaily,
  getAlertEvents,
  getAlertRules,
  getDistrictById,
  getDistrictHistory,
  getWeatherData,
  getLatestRun,
  sortDistrictsByRisk,
  buildDistrictHistory
} from "./data";

// Drop fields that are noisy (record IDs, big text bodies) so the model's
// context budget goes to the data that matters for answers.
function trimDistrict(d) {
  if (!d) return null;
  return {
    district_id: d.district_id,
    district_name: d.district_name,
    max_fire_prob: round3(d.max_fire_prob),
    high_or_very_high_area_pct: round1(d.high_or_very_high_area_pct),
    hotspot_count_24h: Number(d.hotspot_count_24h || 0),
    dominant_risk_class: d.dominant_risk_class,
    operational_severity: d.operational_severity,
    forecast_max_fire_prob: round3(d.forecast_max_fire_prob),
    forecast_date: d.forecast_date
  };
}

function trimAlert(a) {
  if (!a) return null;
  return {
    alert_id: a.alert_id,
    district_id: a.district_id,
    district_name: a.district_name,
    severity: a.severity,
    trigger_reason: a.trigger_reason,
    sent_at: a.sent_at,
    max_fire_prob: round3(a.max_fire_prob),
    high_or_very_high_area_pct: round1(a.high_or_very_high_area_pct),
    hotspot_count_24h: Number(a.hotspot_count_24h || 0)
  };
}

function trimFire(f) {
  if (!f) return null;
  return {
    fire_id: f.fire_id,
    district_id: f.district_id,
    district_name: f.district_name,
    detected_at: f.detected_at,
    confidence: f.confidence,
    source: f.source,
    lat: f.lat,
    lon: f.lon
  };
}

function round3(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null;
}
function round1(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

// Loose name match: "alanya", "ALANYA", "Alanya" all work.
// Also matches Turkish-stripped variants ("manavgat" matches "Manavgat").
function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c").replace(/i̇/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

async function findDistrictByLooseName(name) {
  const all = await getDistrictRiskDaily();
  const target = normalizeName(name);
  return all.find((d) =>
    normalizeName(d.district_name) === target ||
    normalizeName(d.district_id) === target ||
    normalizeName(d.district_name).startsWith(target) ||
    normalizeName(d.district_id).startsWith(target)
  ) || null;
}

// ──────────── Tool implementations ────────────

export async function tool_get_districts_now() {
  const districts = await getDistrictRiskDaily();
  const sorted = sortDistrictsByRisk(districts);
  const run = await getLatestRun();
  return {
    run_date: run?.run_date || null,
    count: sorted.length,
    districts: sorted.map(trimDistrict)
  };
}

export async function tool_get_district({ name }) {
  const match = await findDistrictByLooseName(name);
  if (!match) {
    return { found: false, message: `No district matching "${name}". Known names: Akseki, Alanya, Elmalı, Finike, Gazipaşa, Gündoğmuş, İbradi, Kale, Kaş, Kemer, Korkuteli, Kumluca, Manavgat, Merkez, Serik.` };
  }
  return { found: true, district: trimDistrict(match) };
}

export async function tool_get_history({ name, days = 14 }) {
  const match = await findDistrictByLooseName(name);
  if (!match) return { found: false, message: `No district matching "${name}".` };
  const id = match.district_id;
  const history = await getDistrictHistory(id);
  // Server returns last N runs already sorted; cap to requested days for budget.
  const capped = (history || []).slice(0, Math.max(1, Math.min(60, Number(days) || 14)));
  return {
    found: true,
    district_id: id,
    district_name: match.district_name,
    history: capped.map((row) => ({
      run_date: row.run_date,
      max_fire_prob: round3(row.max_fire_prob),
      high_or_very_high_area_pct: round1(row.high_or_very_high_area_pct),
      hotspot_count_24h: Number(row.hotspot_count_24h || 0),
      operational_severity: row.operational_severity || null
    }))
  };
}

export async function tool_get_active_fires() {
  const fires = await getActiveFireDaily();
  return {
    count: fires.length,
    fires: fires.map(trimFire)
  };
}

export async function tool_get_weather_now() {
  const w = await getWeatherData();
  if (!w?.current) return { available: false };
  return {
    available: true,
    fetched_at: w.fetched_at,
    current: {
      temp_c: w.current.temp_c,
      humidity_pct: w.current.humidity_pct,
      wind_speed_kmh: w.current.wind_speed_kmh,
      wind_direction: w.current.wind_direction,
      description: w.current.description
    }
  };
}

export async function tool_get_weather_forecast() {
  const w = await getWeatherData();
  if (!w?.tomorrow) return { available: false };
  return {
    available: true,
    tomorrow: {
      date: w.tomorrow.date,
      temp_max_c: w.tomorrow.temp_max_c,
      humidity_min_pct: w.tomorrow.humidity_min_pct,
      wind_max_kmh: w.tomorrow.wind_max_kmh,
      description: w.tomorrow.description,
      risk_modifier: w.tomorrow.risk_modifier
    }
  };
}

export async function tool_get_top_risk({ n = 5 } = {}) {
  const districts = await getDistrictRiskDaily();
  const sorted = sortDistrictsByRisk(districts);
  const cap = Math.max(1, Math.min(15, Number(n) || 5));
  return {
    count: cap,
    districts: sorted.slice(0, cap).map(trimDistrict)
  };
}

export async function tool_get_recent_alerts({ hours = 24 } = {}) {
  const all = await getAlertEvents();
  const since = new Date(Date.now() - Math.max(1, Math.min(168, Number(hours) || 24)) * 3600 * 1000).toISOString();
  const recent = (all || []).filter((a) => a.sent_at && a.sent_at >= since);
  return {
    window_hours: hours,
    count: recent.length,
    alerts: recent.map(trimAlert)
  };
}

// Map tool name → implementation, for the dispatch loop in the API route.
export const TOOLS = {
  get_districts_now: tool_get_districts_now,
  get_district: tool_get_district,
  get_history: tool_get_history,
  get_active_fires: tool_get_active_fires,
  get_weather_now: tool_get_weather_now,
  get_weather_forecast: tool_get_weather_forecast,
  get_top_risk: tool_get_top_risk,
  get_recent_alerts: tool_get_recent_alerts
};
