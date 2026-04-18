import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

const PUSH_SUBS_FILE = "push-subscriptions.json";

async function resolveRuntimeCacheDir() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../..")
  ];

  for (const root of candidates) {
    const mockDir = path.join(root, "data", "mock");
    try {
      await fs.access(mockDir);
      const runtimeDir = path.join(root, "data", "runtime-cache");
      await fs.mkdir(runtimeDir, { recursive: true });
      return runtimeDir;
    } catch {
      continue;
    }
  }
  throw new Error("Cannot find data/runtime-cache directory");
}

export async function readSubscriptions() {
  const dir = await resolveRuntimeCacheDir();
  try {
    const raw = await fs.readFile(path.join(dir, PUSH_SUBS_FILE), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function addSubscription(sub) {
  const dir = await resolveRuntimeCacheDir();
  const filePath = path.join(dir, PUSH_SUBS_FILE);
  const current = await readSubscriptions();
  const filtered = current.filter((s) => s.endpoint !== sub.endpoint);
  await fs.writeFile(filePath, JSON.stringify([sub, ...filtered], null, 2) + "\n", "utf8");
}

export async function removeSubscription(endpoint) {
  const dir = await resolveRuntimeCacheDir();
  const filePath = path.join(dir, PUSH_SUBS_FILE);
  const current = await readSubscriptions();
  const filtered = current.filter((s) => s.endpoint !== endpoint);
  await fs.writeFile(filePath, JSON.stringify(filtered, null, 2) + "\n", "utf8");
}
