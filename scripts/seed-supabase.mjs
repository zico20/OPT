import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseEnvFile(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

async function loadRootEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const contents = await fs.readFile(envPath, "utf8");
  const parsed = parseEnvFile(contents);

  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function readMockJson(name) {
  const filePath = path.join(process.cwd(), "data", "mock", name);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function seed() {
  await loadRootEnv();

  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    process.env.SUPABASE_SERVICE_ROLE_KEY || requireEnv("SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  const [
    latestRun,
    runs,
    districts,
    fires,
    alerts,
    subscribers,
    alertRules,
    mapConfig
  ] = await Promise.all([
    readMockJson("latest-run.json"),
    readMockJson("runs.json"),
    readMockJson("district-risk-daily.json"),
    readMockJson("active-fire-daily.json"),
    readMockJson("alert-events.json"),
    readMockJson("subscribers.json"),
    readMockJson("alert-rules.json"),
    readMockJson("map-config.json")
  ]);

  const allRuns = [
    latestRun,
    ...runs.filter((run) => run.run_id !== latestRun.run_id)
  ];

  const districtRows = districts.map((district) => ({
    ...district,
    run_id: latestRun.run_id
  }));

  const fireRows = fires.map((fire) => ({
    ...fire,
    run_id: latestRun.run_id
  }));

  const rulesRow = {
    ruleset_id: "default",
    ...alertRules
  };

  const configRow = {
    config_id: "default",
    ...mapConfig,
    gee_app_url: mapConfig.gee_app_url || process.env.NEXT_PUBLIC_EE_APP_URL || ""
  };

  const deleteChildrenFirst = [
    ["alert_events", "alert_id", alerts.map((alert) => alert.alert_id)],
    ["active_fire_daily", "run_id", [latestRun.run_id]],
    ["district_risk_daily", "run_id", [latestRun.run_id]]
  ];

  for (const [table, column, ids] of deleteChildrenFirst) {
    if (!ids || ids.length === 0) {
      continue;
    }
    const { error } = await supabase.from(table).delete().in(column, ids);
    if (error) {
      throw new Error(`Failed to clear ${table}: ${error.message}`);
    }
  }

  const runsResponse = await supabase
    .from("runs")
    .upsert(allRuns, { onConflict: "run_id" });
  if (runsResponse.error) {
    throw new Error(`Failed to seed runs: ${runsResponse.error.message}`);
  }

  if (districtRows.length > 0) {
    const districtResponse = await supabase
      .from("district_risk_daily")
      .upsert(districtRows, { onConflict: "run_id,district_id" });
    if (districtResponse.error) {
      throw new Error(`Failed to seed district_risk_daily: ${districtResponse.error.message}`);
    }
  }

  if (fireRows.length > 0) {
    const fireResponse = await supabase
      .from("active_fire_daily")
      .upsert(fireRows, { onConflict: "fire_id" });
    if (fireResponse.error) {
      throw new Error(`Failed to seed active_fire_daily: ${fireResponse.error.message}`);
    }
  }

  if (alerts.length > 0) {
    const alertResponse = await supabase
      .from("alert_events")
      .upsert(alerts, { onConflict: "alert_id" });
    if (alertResponse.error) {
      throw new Error(`Failed to seed alert_events: ${alertResponse.error.message}`);
    }
  }

  if (subscribers.length > 0) {
    const subscriberResponse = await supabase
      .from("subscribers")
      .upsert(subscribers, { onConflict: "subscriber_id" });
    if (subscriberResponse.error) {
      throw new Error(`Failed to seed subscribers: ${subscriberResponse.error.message}`);
    }
  }

  const rulesResponse = await supabase
    .from("alert_rules")
    .upsert(rulesRow, { onConflict: "ruleset_id" });
  if (rulesResponse.error) {
    throw new Error(`Failed to seed alert_rules: ${rulesResponse.error.message}`);
  }

  const configResponse = await supabase
    .from("map_config")
    .upsert(configRow, { onConflict: "config_id" });
  if (configResponse.error) {
    throw new Error(`Failed to seed map_config: ${configResponse.error.message}`);
  }

  process.stdout.write("Supabase seed completed successfully.\n");
}

seed().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
