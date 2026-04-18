import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "./serverEnv";

const FILES = {
  latestRun: "latest-run.json",
  runs: "runs.json",
  districtRiskDaily: "district-risk-daily.json",
  activeFireDaily: "active-fire-daily.json",
  alertEvents: "alert-events.json",
  subscribers: "subscribers.json",
  alertRules: "alert-rules.json",
  mapConfig: "map-config.json"
};

const DEFAULT_ALERT_RULES = {
  ruleset_id: "default",
  probability_watch_min: 0.55,
  probability_warning_min: 0.7,
  high_or_very_high_area_pct_min: 10,
  hotspot_count_critical_min: 1,
  updated_at: null
};

const DEFAULT_MAP_CONFIG = {
  config_id: "default",
  region_name: "Antalya, Turkey",
  timezone: "Europe/Istanbul",
  refresh_cadence: "Daily at 08:00",
  gee_app_url: "",
  download_base_url: "",
  legend: [
    { class: "Very Low", color: "#4575b4" },
    { class: "Low", color: "#91bfdb" },
    { class: "Medium", color: "#ffffbf" },
    { class: "High", color: "#fdae61" },
    { class: "Very High", color: "#d73027" }
  ]
};

const RUNTIME_CACHE_DIR = "runtime-cache";

function candidateRoots() {
  return [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../..")
  ];
}

async function resolveMockDir() {
  for (const root of candidateRoots()) {
    const mockDir = path.join(root, "data", "mock");
    try {
      await fs.access(mockDir);
      return mockDir;
    } catch (error) {
      continue;
    }
  }
  throw new Error("Unable to find data/mock directory.");
}

async function resolveRuntimeCacheDir() {
  const mockDir = await resolveMockDir();
  const runtimeDir = path.join(path.dirname(mockDir), RUNTIME_CACHE_DIR);
  await fs.mkdir(runtimeDir, { recursive: true });
  return runtimeDir;
}

async function tryReadJsonFile(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function readJson(filename) {
  const mockDir = await resolveMockDir();
  const filePath = path.join(mockDir, filename);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filename, value) {
  const mockDir = await resolveMockDir();
  const filePath = path.join(mockDir, filename);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readLocalFallbackJson(filename, fallbackValue = undefined) {
  const mockDir = await resolveMockDir();
  const runtimeFile = path.join(path.dirname(mockDir), RUNTIME_CACHE_DIR, filename);
  const mockFile = path.join(mockDir, filename);

  const runtimeValue = await tryReadJsonFile(runtimeFile);
  if (runtimeValue !== undefined) {
    return runtimeValue;
  }

  const mockValue = await tryReadJsonFile(mockFile);
  if (mockValue !== undefined) {
    return mockValue;
  }

  if (fallbackValue !== undefined) {
    return fallbackValue;
  }

  throw new Error(`Unable to find local fallback data for ${filename}.`);
}

async function writeRuntimeCacheJson(filename, value) {
  const runtimeDir = await resolveRuntimeCacheDir();
  const filePath = path.join(runtimeDir, filename);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function mirrorRuntimeCache(filename, value) {
  try {
    await writeRuntimeCacheJson(filename, value);
  } catch (error) {
    console.error(`[data] Failed to update runtime cache for ${filename}:`, error);
  }
}

async function loadLocalFallbackAndMirror(filename, fallbackValue = undefined) {
  const value = await readLocalFallbackJson(filename, fallbackValue);
  await mirrorRuntimeCache(filename, value);
  return value;
}

function logSupabaseFallback(key, error) {
  console.error(`[data] Supabase read for ${key} failed; using local fallback.`, error);
}

function useSupabase() {
  return Boolean(
    getServerEnv("SUPABASE_URL") &&
    (getServerEnv("SUPABASE_SERVICE_ROLE_KEY") || getServerEnv("SUPABASE_ANON_KEY"))
  );
}

let supabaseClient = null;

function getSupabase() {
  if (!useSupabase()) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      getServerEnv("SUPABASE_URL"),
      getServerEnv("SUPABASE_SERVICE_ROLE_KEY") || getServerEnv("SUPABASE_ANON_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }

  return supabaseClient;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRun(run) {
  if (!run) {
    return null;
  }

  return {
    ...run,
    selected_threshold: Number(run.selected_threshold || 0),
    fire_f1: Number(run.fire_f1 || 0),
    fire_precision: Number(run.fire_precision || 0),
    fire_recall: Number(run.fire_recall || 0),
    balanced_accuracy: Number(run.balanced_accuracy || 0),
    critical_districts: Number(run.critical_districts || 0),
    warning_districts: Number(run.warning_districts || 0),
    active_fire_districts: Number(run.active_fire_districts || 0),
    download_urls: run.download_urls || {
      risk_prob: "#",
      risk_class: "#",
      risk_binary: "#",
      run_report: "#"
    }
  };
}

function normalizeDistrict(district) {
  return {
    ...district,
    lat: Number(district.lat || 0),
    lon: Number(district.lon || 0),
    mean_risk: Number(district.mean_risk || 0),
    max_fire_prob: Number(district.max_fire_prob || 0),
    high_or_very_high_area_pct: Number(district.high_or_very_high_area_pct || 0),
    hotspot_count_24h: Number(district.hotspot_count_24h || 0)
  };
}

function normalizeFire(fire) {
  return {
    ...fire,
    lat: Number(fire.lat || 0),
    lon: Number(fire.lon || 0)
  };
}

function normalizeAlert(alert) {
  return {
    ...alert,
    max_fire_prob: Number(alert.max_fire_prob || 0),
    high_or_very_high_area_pct: Number(alert.high_or_very_high_area_pct || 0),
    hotspot_count_24h: Number(alert.hotspot_count_24h || 0)
  };
}

function normalizeRules(rules) {
  return {
    ...DEFAULT_ALERT_RULES,
    ...(rules || {}),
    probability_watch_min: Number((rules || DEFAULT_ALERT_RULES).probability_watch_min),
    probability_warning_min: Number((rules || DEFAULT_ALERT_RULES).probability_warning_min),
    high_or_very_high_area_pct_min: Number((rules || DEFAULT_ALERT_RULES).high_or_very_high_area_pct_min),
    hotspot_count_critical_min: Number((rules || DEFAULT_ALERT_RULES).hotspot_count_critical_min)
  };
}

function normalizeMapConfig(config) {
  const merged = {
    ...DEFAULT_MAP_CONFIG,
    ...(config || {})
  };

  return {
    ...merged,
    gee_app_url: merged.gee_app_url || getServerEnv("NEXT_PUBLIC_EE_APP_URL") || "",
    legend: ensureArray(merged.legend).length > 0 ? merged.legend : DEFAULT_MAP_CONFIG.legend
  };
}

async function queryLatestRunFromSupabase() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("run_date", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Supabase getLatestRun failed: ${error.message}`);
  }

  return normalizeRun(data[0] || null);
}

export async function getLatestRun() {
  if (!useSupabase()) {
    return normalizeRun(await loadLocalFallbackAndMirror(FILES.latestRun, null));
  }

  try {
    const run = await queryLatestRunFromSupabase();
    await mirrorRuntimeCache(FILES.latestRun, run);
    return run;
  } catch (error) {
    logSupabaseFallback("latestRun", error);
    return normalizeRun(await loadLocalFallbackAndMirror(FILES.latestRun, null));
  }
}

export async function getRuns() {
  if (!useSupabase()) {
    return ensureArray(await loadLocalFallbackAndMirror(FILES.runs, [])).map(normalizeRun);
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .order("run_date", { ascending: false });

    if (error) {
      throw new Error(`Supabase getRuns failed: ${error.message}`);
    }

    await mirrorRuntimeCache(FILES.runs, data);
    return ensureArray(data).map(normalizeRun);
  } catch (error) {
    logSupabaseFallback("runs", error);
    return ensureArray(await loadLocalFallbackAndMirror(FILES.runs, [])).map(normalizeRun);
  }
}

export async function getDistrictRiskDaily() {
  if (!useSupabase()) {
    return ensureArray(await loadLocalFallbackAndMirror(FILES.districtRiskDaily, [])).map(normalizeDistrict);
  }

  try {
    const latestRun = await getLatestRun();
    if (!latestRun) {
      return [];
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("district_risk_daily")
      .select("*")
      .eq("run_id", latestRun.run_id)
      .order("max_fire_prob", { ascending: false });

    if (error) {
      throw new Error(`Supabase getDistrictRiskDaily failed: ${error.message}`);
    }

    await mirrorRuntimeCache(FILES.districtRiskDaily, data);
    return ensureArray(data).map(normalizeDistrict);
  } catch (error) {
    logSupabaseFallback("districtRiskDaily", error);
    return ensureArray(await loadLocalFallbackAndMirror(FILES.districtRiskDaily, [])).map(normalizeDistrict);
  }
}

export async function getActiveFireDaily() {
  if (!useSupabase()) {
    return ensureArray(await loadLocalFallbackAndMirror(FILES.activeFireDaily, [])).map(normalizeFire);
  }

  try {
    const latestRun = await getLatestRun();
    if (!latestRun) {
      return [];
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("active_fire_daily")
      .select("*")
      .eq("run_id", latestRun.run_id)
      .order("detected_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase getActiveFireDaily failed: ${error.message}`);
    }

    await mirrorRuntimeCache(FILES.activeFireDaily, data);
    return ensureArray(data).map(normalizeFire);
  } catch (error) {
    logSupabaseFallback("activeFireDaily", error);
    return ensureArray(await loadLocalFallbackAndMirror(FILES.activeFireDaily, [])).map(normalizeFire);
  }
}

export async function getAlertEvents() {
  if (!useSupabase()) {
    return ensureArray(await loadLocalFallbackAndMirror(FILES.alertEvents, [])).map(normalizeAlert);
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("alert_events")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Supabase getAlertEvents failed: ${error.message}`);
    }

    await mirrorRuntimeCache(FILES.alertEvents, data);
    return ensureArray(data).map(normalizeAlert);
  } catch (error) {
    logSupabaseFallback("alertEvents", error);
    return ensureArray(await loadLocalFallbackAndMirror(FILES.alertEvents, [])).map(normalizeAlert);
  }
}

export async function getSubscribers() {
  if (!useSupabase()) {
    return ensureArray(await loadLocalFallbackAndMirror(FILES.subscribers, []));
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("subscribers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase getSubscribers failed: ${error.message}`);
    }

    await mirrorRuntimeCache(FILES.subscribers, data);
    return ensureArray(data);
  } catch (error) {
    logSupabaseFallback("subscribers", error);
    return ensureArray(await loadLocalFallbackAndMirror(FILES.subscribers, []));
  }
}

export async function getAlertRules() {
  if (!useSupabase()) {
    return normalizeRules(await loadLocalFallbackAndMirror(FILES.alertRules, DEFAULT_ALERT_RULES));
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("ruleset_id", "default")
      .limit(1);

    if (error) {
      throw new Error(`Supabase getAlertRules failed: ${error.message}`);
    }

    await mirrorRuntimeCache(FILES.alertRules, data[0] || DEFAULT_ALERT_RULES);
    return normalizeRules(data[0] || null);
  } catch (error) {
    logSupabaseFallback("alertRules", error);
    return normalizeRules(await loadLocalFallbackAndMirror(FILES.alertRules, DEFAULT_ALERT_RULES));
  }
}

export async function getMapConfig() {
  if (!useSupabase()) {
    return normalizeMapConfig(await loadLocalFallbackAndMirror(FILES.mapConfig, DEFAULT_MAP_CONFIG));
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("map_config")
      .select("*")
      .eq("config_id", "default")
      .limit(1);

    if (error) {
      throw new Error(`Supabase getMapConfig failed: ${error.message}`);
    }

    await mirrorRuntimeCache(FILES.mapConfig, data[0] || DEFAULT_MAP_CONFIG);
    return normalizeMapConfig(data[0] || null);
  } catch (error) {
    logSupabaseFallback("mapConfig", error);
    return normalizeMapConfig(await loadLocalFallbackAndMirror(FILES.mapConfig, DEFAULT_MAP_CONFIG));
  }
}

export async function addSubscriber(subscriber) {
  if (!useSupabase()) {
    const current = await getSubscribers();
    const next = [...current, subscriber];
    await writeJson(FILES.subscribers, next);
    return subscriber;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("subscribers")
    .insert(subscriber)
    .select()
    .limit(1);

  if (error) {
    throw new Error(`Supabase addSubscriber failed: ${error.message}`);
  }

  return data[0];
}

export async function upsertSubscriber(subscriber) {
  if (!useSupabase()) {
    const current = await getSubscribers();
    const next = current.filter((item) => item.subscriber_id !== subscriber.subscriber_id);
    next.unshift(subscriber);
    await writeJson(FILES.subscribers, next);
    return subscriber;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("subscribers")
    .upsert(subscriber, { onConflict: "subscriber_id" })
    .select()
    .limit(1);

  if (error) {
    throw new Error(`Supabase upsertSubscriber failed: ${error.message}`);
  }

  return data[0];
}

export async function disableSubscriberById(subscriberId) {
  if (!useSupabase()) {
    const current = await getSubscribers();
    const next = current.map((item) => (
      item.subscriber_id === subscriberId
        ? { ...item, enabled: false }
        : item
    ));
    await writeJson(FILES.subscribers, next);
    return next.find((item) => item.subscriber_id === subscriberId) || null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("subscribers")
    .update({ enabled: false })
    .eq("subscriber_id", subscriberId)
    .select()
    .limit(1);

  if (error) {
    throw new Error(`Supabase disableSubscriberById failed: ${error.message}`);
  }

  return data[0] || null;
}

export async function updateAlertRules(patch) {
  if (!useSupabase()) {
    const current = await getAlertRules();
    const next = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString()
    };
    await writeJson(FILES.alertRules, next);
    return next;
  }

  const supabase = getSupabase();
  const payload = {
    ruleset_id: "default",
    ...patch,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("alert_rules")
    .upsert(payload, { onConflict: "ruleset_id" })
    .select()
    .limit(1);

  if (error) {
    throw new Error(`Supabase updateAlertRules failed: ${error.message}`);
  }

  return normalizeRules(data[0]);
}

export async function appendAlertEvent(alertEvent) {
  if (!useSupabase()) {
    const current = await getAlertEvents();
    const next = [alertEvent, ...current];
    await writeJson(FILES.alertEvents, next);
    return alertEvent;
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("alert_events")
    .upsert(alertEvent, { onConflict: "alert_id" });

  if (error) {
    throw new Error(`Supabase appendAlertEvent failed: ${error.message}`);
  }

  return alertEvent;
}

export async function getDistrictById(districtId) {
  if (!useSupabase()) {
    const districts = await getDistrictRiskDaily();
    return districts.find((district) => district.district_id === districtId) || null;
  }

  try {
    const latestRun = await getLatestRun();
    if (!latestRun) {
      return null;
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("district_risk_daily")
      .select("*")
      .eq("run_id", latestRun.run_id)
      .eq("district_id", districtId)
      .limit(1);

    if (error) {
      throw new Error(`Supabase getDistrictById failed: ${error.message}`);
    }

    return data[0] ? normalizeDistrict(data[0]) : null;
  } catch (error) {
    logSupabaseFallback("districtById", error);
    const districts = await getDistrictRiskDaily();
    return districts.find((district) => district.district_id === districtId) || null;
  }
}

export async function getDistrictHistory(districtId) {
  if (!useSupabase()) {
    const [district, runs] = await Promise.all([
      getDistrictById(districtId),
      getRuns()
    ]);
    return buildDistrictHistory(district, runs);
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("district_risk_daily")
      .select("run_id, mean_risk, max_fire_prob, high_or_very_high_area_pct, created_at")
      .eq("district_id", districtId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      throw new Error(`Supabase getDistrictHistory failed: ${error.message}`);
    }

    const rows = ensureArray(data);
    const runIds = [...new Set(rows.map((row) => row.run_id).filter(Boolean))];
    if (runIds.length === 0) {
      return [];
    }

    const runsResponse = await supabase
      .from("runs")
      .select("run_id, run_date")
      .in("run_id", runIds);

    if (runsResponse.error) {
      throw new Error(`Supabase getDistrictHistory runs failed: ${runsResponse.error.message}`);
    }

    const runDateById = new Map(
      ensureArray(runsResponse.data).map((run) => [run.run_id, run.run_date])
    );

    return rows.map((row) => ({
      run_date: runDateById.get(row.run_id) || String(row.created_at || "").slice(0, 10),
      mean_risk: Number(row.mean_risk || 0),
      max_fire_prob: Number(row.max_fire_prob || 0),
      high_or_very_high_area_pct: Number(row.high_or_very_high_area_pct || 0)
    }));
  } catch (error) {
    logSupabaseFallback("districtHistory", error);
    const [district, runs] = await Promise.all([
      getDistrictById(districtId),
      getRuns()
    ]);
    return buildDistrictHistory(district, runs);
  }
}

export function buildDistrictHistory(district, runs) {
  if (!district) {
    return [];
  }

  const baseMean = Number(district.mean_risk);
  const baseMax = Number(district.max_fire_prob);
  const baseArea = Number(district.high_or_very_high_area_pct);

  return runs.map((run, index) => {
    const shift = (runs.length - index - 1) * 0.03;
    return {
      run_date: run.run_date,
      mean_risk: Number(Math.max(0.05, baseMean - shift).toFixed(2)),
      max_fire_prob: Number(Math.max(0.1, baseMax - shift).toFixed(2)),
      high_or_very_high_area_pct: Number(Math.max(0, baseArea - shift * 10).toFixed(1))
    };
  });
}

export function sortDistrictsByRisk(districts) {
  return [...districts].sort((a, b) => Number(b.max_fire_prob) - Number(a.max_fire_prob));
}

const DOMINANT_CLASS_WEIGHT = {
  "Very Low": 1,
  Low: 2,
  Medium: 3,
  High: 4,
  "Very High": 5
};

const SEVERITY_WEIGHT = {
  Critical: 3,
  Warning: 2,
  Watch: 1
};

export function deriveOperationalSeverity(district, rules = DEFAULT_ALERT_RULES) {
  const hasHotspot = Number(district?.hotspot_count_24h || 0) >= Number(rules?.hotspot_count_critical_min || 1);
  const highArea =
    Number(district?.high_or_very_high_area_pct || 0) >= Number(rules?.high_or_very_high_area_pct_min || 10);
  const highProb = Number(district?.max_fire_prob || 0) >= Number(rules?.probability_warning_min || 0.7);
  const watchProb = Number(district?.max_fire_prob || 0) >= Number(rules?.probability_watch_min || 0.55);

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

export function sortDistrictsForOperations(districts, rules = DEFAULT_ALERT_RULES) {
  return [...districts].sort((a, b) => {
    const severityDelta =
      Number(SEVERITY_WEIGHT[deriveOperationalSeverity(b, rules)] || 0) -
      Number(SEVERITY_WEIGHT[deriveOperationalSeverity(a, rules)] || 0);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    const hotspotDelta = Number(b.hotspot_count_24h || 0) - Number(a.hotspot_count_24h || 0);
    if (hotspotDelta !== 0) {
      return hotspotDelta;
    }

    const highAreaDelta = Number(b.high_or_very_high_area_pct || 0) - Number(a.high_or_very_high_area_pct || 0);
    if (highAreaDelta !== 0) {
      return highAreaDelta;
    }

    const dominantClassDelta =
      Number(DOMINANT_CLASS_WEIGHT[b.dominant_risk_class] || 0) -
      Number(DOMINANT_CLASS_WEIGHT[a.dominant_risk_class] || 0);
    if (dominantClassDelta !== 0) {
      return dominantClassDelta;
    }

    const meanRiskDelta = Number(b.mean_risk || 0) - Number(a.mean_risk || 0);
    if (meanRiskDelta !== 0) {
      return meanRiskDelta;
    }

    const maxProbDelta = Number(b.max_fire_prob || 0) - Number(a.max_fire_prob || 0);
    if (maxProbDelta !== 0) {
      return maxProbDelta;
    }

    return String(a.district_name || "").localeCompare(String(b.district_name || ""));
  });
}
