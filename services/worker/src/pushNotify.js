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
  return null;
}

async function readPushSubscriptions() {
  const dir = await resolveRuntimeCacheDir();
  if (!dir) return [];
  try {
    const raw = await fs.readFile(path.join(dir, PUSH_SUBS_FILE), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function removeStaleSubs(endpoints) {
  if (endpoints.length === 0) return;
  const dir = await resolveRuntimeCacheDir();
  if (!dir) return;
  try {
    const filePath = path.join(dir, PUSH_SUBS_FILE);
    const raw = await fs.readFile(filePath, "utf8");
    const subs = JSON.parse(raw);
    const filtered = subs.filter((s) => !endpoints.includes(s.endpoint));
    await fs.writeFile(filePath, JSON.stringify(filtered, null, 2) + "\n", "utf8");
  } catch {
    // ignore
  }
}

export async function sendWebPushNotifications({ title, body, url = "/" }) {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@hazardsignal.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return { sent: 0, failed: 0, skipped: true, reason: "VAPID keys not configured" };
  }

  const subscriptions = await readPushSubscriptions();
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: true, reason: "no subscribers" };
  }

  let webpush;
  try {
    webpush = (await import("web-push")).default;
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error("[push] web-push module not available:", err.message);
    return { sent: 0, failed: 0, skipped: true, reason: "web-push not installed" };
  }

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  let failed = 0;
  const staleEndpoints = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.error("[push] Send failed:", err.message);
        }
      }
    })
  );

  if (staleEndpoints.length > 0) {
    await removeStaleSubs(staleEndpoints);
  }

  return { sent, failed, skipped: false };
}
