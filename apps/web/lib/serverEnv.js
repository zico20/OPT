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

let cachedEnv = null;

function readRootEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const envPath = findRootEnvFile();
  if (!envPath) {
    cachedEnv = {};
    return cachedEnv;
  }

  const contents = fs.readFileSync(envPath, "utf8");
  cachedEnv = parseEnvFile(contents);
  return cachedEnv;
}

export function getServerEnv(key, fallback = "") {
  return process.env[key] || readRootEnv()[key] || fallback;
}
