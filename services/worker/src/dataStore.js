import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadRootEnv } from "./loadEnv.js";

loadRootEnv();

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
  hotspot_count_critical_min: 1
};

const DEFAULT_MAP_CONFIG = {
  config_id: "default",
  region_name: "Antalya, Turkey",
  timezone: "Europe/Istanbul",
  refresh_cadence: "Daily at 08:00",
  gee_app_url: process.env.NEXT_PUBLIC_EE_APP_URL || "",
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

function getCandidateRoots() {
  return [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../..")
  ];
}

async function resolveMockDir() {
  for (const candidate of getCandidateRoots()) {
    const mockDir = path.join(candidate, "data", "mock");
    try {
      await fs.access(mockDir);
      return mockDir;
    } catch (error) {
      continue;
    }
  }
  throw new Error("Could not locate data/mock directory.");
}

async function resolveRuntimeCacheDir() {
  const mockDir = await resolveMockDir();
  const runtimeDir = path.join(path.dirname(mockDir), RUNTIME_CACHE_DIR);
  await fs.mkdir(runtimeDir, { recursive: true });
  return runtimeDir;
}

async function tryReadJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function readJsonFile(filename) {
  const mockDir = await resolveMockDir();
  const filePath = path.join(mockDir, filename);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJsonFile(filename, data) {
  const mockDir = await resolveMockDir();
  const filePath = path.join(mockDir, filename);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readLocalFallbackFile(filename, fallbackValue = undefined) {
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

  throw new Error(`Could not locate local fallback file for ${filename}.`);
}

async function writeRuntimeJsonFile(filename, data) {
  const runtimeDir = await resolveRuntimeCacheDir();
  const filePath = path.join(runtimeDir, filename);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function mirrorRuntimeCache(filename, data) {
  try {
    await writeRuntimeJsonFile(filename, data);
  } catch (error) {
    console.error(`[dataStore] Failed to update runtime cache for ${filename}:`, error);
  }
}

async function loadLocalFallbackAndMirror(filename, fallbackValue = undefined) {
  const data = await readLocalFallbackFile(filename, fallbackValue);
  await mirrorRuntimeCache(filename, data);
  return data;
}

function logSupabaseFallback(action, key, error) {
  console.error(`[dataStore] Supabase ${action} for ${key} failed; using local fallback.`, error);
}

function useSupabase() {
  return Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  );
}

let supabaseClient = null;

function getSupabase() {
  if (!useSupabase()) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
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

function getUpsertKey(key) {
  if (key === "alertEvents") {
    return "alert_id";
  }
  if (key === "subscribers") {
    return "subscriber_id";
  }
  throw new Error(`Local record upsert is not supported for key: ${key}`);
}

async function upsertLocalRecord(key, record, { mirrorMock = false } = {}) {
  const idField = getUpsertKey(key);
  const current = ensureArray(await readLocalFallbackFile(FILES[key], []));
  const next = [record, ...current.filter((item) => item[idField] !== record[idField])];
  await writeRuntimeJsonFile(FILES[key], next);
  if (mirrorMock) {
    await writeJsonFile(FILES[key], next);
  }
  return record;
}

async function syncLocalRunState(runRecord, { mirrorMock = false } = {}) {
  const runs = ensureArray(await readLocalFallbackFile(FILES.runs, []));
  const filtered = runs.filter((run) => run.run_id !== runRecord.run_id);
  filtered.push(runRecord);
  filtered.sort((a, b) => a.run_date.localeCompare(b.run_date));

  await writeRuntimeJsonFile(FILES.latestRun, runRecord);
  await writeRuntimeJsonFile(FILES.runs, filtered);

  if (mirrorMock) {
    await writeJsonFile(FILES.latestRun, runRecord);
    await writeJsonFile(FILES.runs, filtered);
  }
}

async function getLatestRunRow() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("run_date", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Supabase latest run query failed: ${error.message}`);
  }

  return data[0] || null;
}

async function readCollectionFromSupabase(key) {
  const supabase = getSupabase();

  switch (key) {
    case "latestRun":
      return await getLatestRunRow();

    case "runs": {
      const { data, error } = await supabase
        .from("runs")
        .select("*")
        .order("run_date", { ascending: false });
      if (error) {
        throw new Error(`Supabase runs query failed: ${error.message}`);
      }
      return data;
    }

    case "districtRiskDaily": {
      const latestRun = await getLatestRunRow();
      if (!latestRun) {
        return [];
      }
      const { data, error } = await supabase
        .from("district_risk_daily")
        .select("*")
        .eq("run_id", latestRun.run_id)
        .order("max_fire_prob", { ascending: false });
      if (error) {
        throw new Error(`Supabase district_risk_daily query failed: ${error.message}`);
      }
      return data;
    }

    case "activeFireDaily": {
      const latestRun = await getLatestRunRow();
      if (!latestRun) {
        return [];
      }
      const { data, error } = await supabase
        .from("active_fire_daily")
        .select("*")
        .eq("run_id", latestRun.run_id)
        .order("detected_at", { ascending: false });
      if (error) {
        throw new Error(`Supabase active_fire_daily query failed: ${error.message}`);
      }
      return data;
    }

    case "alertEvents": {
      const { data, error } = await supabase
        .from("alert_events")
        .select("*")
        .order("sent_at", { ascending: false });
      if (error) {
        throw new Error(`Supabase alert_events query failed: ${error.message}`);
      }
      return data;
    }

    case "subscribers": {
      const { data, error } = await supabase
        .from("subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error(`Supabase subscribers query failed: ${error.message}`);
      }
      return data;
    }

    case "alertRules": {
      const { data, error } = await supabase
        .from("alert_rules")
        .select("*")
        .eq("ruleset_id", "default")
        .limit(1);
      if (error) {
        throw new Error(`Supabase alert_rules query failed: ${error.message}`);
      }
      return data[0] || DEFAULT_ALERT_RULES;
    }

    case "mapConfig": {
      const { data, error } = await supabase
        .from("map_config")
        .select("*")
        .eq("config_id", "default")
        .limit(1);
      if (error) {
        throw new Error(`Supabase map_config query failed: ${error.message}`);
      }
      return {
        ...DEFAULT_MAP_CONFIG,
        ...(data[0] || {})
      };
    }

    default:
      throw new Error(`Unsupported collection key: ${key}`);
  }
}

async function writeCollectionToSupabase(key, data) {
  const supabase = getSupabase();

  switch (key) {
    case "runs": {
      const rows = ensureArray(data);
      if (rows.length === 0) {
        return rows;
      }
      const { error } = await supabase
        .from("runs")
        .upsert(rows, { onConflict: "run_id" });
      if (error) {
        throw new Error(`Supabase runs upsert failed: ${error.message}`);
      }
      return rows;
    }

    case "districtRiskDaily": {
      const latestRun = await getLatestRunRow();
      if (!latestRun) {
        throw new Error("Cannot write districtRiskDaily without an existing latest run.");
      }
      const rows = ensureArray(data).map((row) => {
        const { record_id, created_at, ...rest } = row;
        return {
          ...rest,
          run_id: latestRun.run_id
        };
      });
      if (rows.length > 0) {
        const insertResponse = await supabase
          .from("district_risk_daily")
          .upsert(rows, { onConflict: "run_id,district_id" });
        if (insertResponse.error) {
          throw new Error(`Supabase district_risk_daily upsert failed: ${insertResponse.error.message}`);
        }
      }
      return rows;
    }

    case "activeFireDaily": {
      const latestRun = await getLatestRunRow();
      if (!latestRun) {
        throw new Error("Cannot write activeFireDaily without an existing latest run.");
      }
      const rows = ensureArray(data).map((row) => ({
        ...row,
        run_id: latestRun.run_id
      }));
      const deleteResponse = await supabase
        .from("active_fire_daily")
        .delete()
        .eq("run_id", latestRun.run_id);
      if (deleteResponse.error) {
        throw new Error(`Supabase active_fire_daily delete failed: ${deleteResponse.error.message}`);
      }
      if (rows.length > 0) {
        const insertResponse = await supabase
          .from("active_fire_daily")
          .upsert(rows, { onConflict: "fire_id" });
        if (insertResponse.error) {
          throw new Error(`Supabase active_fire_daily upsert failed: ${insertResponse.error.message}`);
        }
      }
      return rows;
    }

    case "alertEvents": {
      const rows = ensureArray(data);
      const runIds = [...new Set(rows.map((row) => row.run_id).filter(Boolean))];
      if (runIds.length > 0) {
        const deleteResponse = await supabase
          .from("alert_events")
          .delete()
          .in("run_id", runIds);
        if (deleteResponse.error) {
          throw new Error(`Supabase alert_events delete failed: ${deleteResponse.error.message}`);
        }
      }
      if (rows.length > 0) {
        const insertResponse = await supabase
          .from("alert_events")
          .upsert(rows, { onConflict: "alert_id" });
        if (insertResponse.error) {
          throw new Error(`Supabase alert_events upsert failed: ${insertResponse.error.message}`);
        }
      }
      return rows;
    }

    case "subscribers": {
      const rows = ensureArray(data);
      const { error } = await supabase
        .from("subscribers")
        .upsert(rows, { onConflict: "subscriber_id" });
      if (error) {
        throw new Error(`Supabase subscribers upsert failed: ${error.message}`);
      }
      return rows;
    }

    case "alertRules": {
      const payload = {
        ruleset_id: "default",
        ...data
      };
      const { error } = await supabase
        .from("alert_rules")
        .upsert(payload, { onConflict: "ruleset_id" });
      if (error) {
        throw new Error(`Supabase alert_rules upsert failed: ${error.message}`);
      }
      return payload;
    }

    case "mapConfig": {
      const payload = {
        config_id: "default",
        ...data
      };
      const { error } = await supabase
        .from("map_config")
        .upsert(payload, { onConflict: "config_id" });
      if (error) {
        throw new Error(`Supabase map_config upsert failed: ${error.message}`);
      }
      return payload;
    }

    default:
      throw new Error(`Unsupported collection key: ${key}`);
  }
}

export async function readCollection(key) {
  if (!useSupabase()) {
    return loadLocalFallbackAndMirror(FILES[key]);
  }

  try {
    const data = await readCollectionFromSupabase(key);
    await mirrorRuntimeCache(FILES[key], data);
    return data;
  } catch (error) {
    logSupabaseFallback("read", key, error);
    return loadLocalFallbackAndMirror(FILES[key]);
  }
}

export async function writeCollection(key, data) {
  if (!useSupabase()) {
    await writeJsonFile(FILES[key], data);
    await mirrorRuntimeCache(FILES[key], data);
    return data;
  }

  try {
    const result = await writeCollectionToSupabase(key, data);
    await mirrorRuntimeCache(FILES[key], result);
    return result;
  } catch (error) {
    logSupabaseFallback("write", key, error);
    await mirrorRuntimeCache(FILES[key], data);
    return data;
  }
}

export async function appendRecord(key, record) {
  if (!useSupabase()) {
    const current = await readCollection(key);
    const next = Array.isArray(current) ? [...current, record] : [record];
    await writeCollection(key, next);
    return next;
  }

  try {
    if (key === "alertEvents") {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("alert_events")
        .upsert(record, { onConflict: "alert_id" });
      if (error) {
        throw new Error(`Supabase append alert event failed: ${error.message}`);
      }
      await upsertLocalRecord(key, record);
      return record;
    }

    if (key === "subscribers") {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("subscribers")
        .upsert(record, { onConflict: "subscriber_id" });
      if (error) {
        throw new Error(`Supabase append subscriber failed: ${error.message}`);
      }
      await upsertLocalRecord(key, record);
      return record;
    }
  } catch (error) {
    logSupabaseFallback("write", key, error);
    return upsertLocalRecord(key, record);
  }

  throw new Error(`appendRecord is not supported for key: ${key}`);
}

export async function replaceLatestRun(runRecord) {
  if (!useSupabase()) {
    await syncLocalRunState(runRecord, { mirrorMock: true });
    return;
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("runs")
      .upsert(runRecord, { onConflict: "run_id" });

    if (error) {
      throw new Error(`Supabase replaceLatestRun failed: ${error.message}`);
    }
  } catch (error) {
    logSupabaseFallback("write", "latestRun", error);
  }

  await syncLocalRunState(runRecord);
}
