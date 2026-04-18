import fs from "node:fs";
import path from "node:path";

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

function findRootEnvFile() {
  const roots = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../..")
  ];

  for (const root of roots) {
    const candidate = path.join(root, ".env");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

let loaded = false;

export function loadRootEnv() {
  if (loaded) {
    return;
  }

  const envPath = findRootEnvFile();
  if (!envPath) {
    loaded = true;
    return;
  }

  const parsed = parseEnvFile(fs.readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  loaded = true;
}
