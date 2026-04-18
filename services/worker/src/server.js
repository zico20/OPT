import crypto from "node:crypto";
import http from "node:http";
import { loadRootEnv } from "./loadEnv.js";
import { exportOperationalAssets } from "./earthEngine.js";
import { runDaily } from "./runDaily.js";
import { readCollection } from "./dataStore.js";

loadRootEnv();

const port = Number(process.env.WORKER_PORT || 8080);
const host = process.env.WORKER_HOST || "127.0.0.1";
const internalToken = process.env.WORKER_INTERNAL_TOKEN || "";

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function parseBooleanParam(value) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function constantTimeEqual(left = "", right = "") {
  const leftBuffer = Buffer.from(String(left), "utf8");
  const rightBuffer = Buffer.from(String(right), "utf8");
  const maxLength = Math.max(leftBuffer.length, rightBuffer.length, 1);

  const normalizedLeft = Buffer.alloc(maxLength);
  const normalizedRight = Buffer.alloc(maxLength);

  leftBuffer.copy(normalizedLeft);
  rightBuffer.copy(normalizedRight);

  const isEqual = crypto.timingSafeEqual(normalizedLeft, normalizedRight);
  return isEqual && leftBuffer.length === rightBuffer.length;
}

function isLocalAddress(address = "") {
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);
}

function getRequestToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const workerHeader = req.headers["x-worker-token"];
  if (Array.isArray(workerHeader)) {
    return workerHeader[0] || "";
  }

  return typeof workerHeader === "string" ? workerHeader.trim() : "";
}

function isAuthorizedWriteRequest(req) {
  const remoteAddress = req.socket.remoteAddress || "";
  if (isLocalAddress(remoteAddress)) {
    return true;
  }

  if (!internalToken) {
    return false;
  }

  return constantTimeEqual(getRequestToken(req), internalToken);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);

  if (req.method === "GET" && url.pathname === "/health") {
    try {
      const latestRun = await readCollection("latestRun");
      const lastRunAt = latestRun?.finished_at || latestRun?.started_at || null;
      const lastRunDate = latestRun?.run_date || null;
      const lastRunStatus = latestRun?.status || null;

      let ageHours = null;
      let isStale = false;
      if (lastRunAt) {
        ageHours = Math.round((Date.now() - new Date(lastRunAt).getTime()) / 36e5 * 10) / 10;
        isStale = ageHours > 26;
      }

      sendJson(res, isStale ? 503 : 200, {
        ok: !isStale,
        service: "fire-risk-worker",
        last_run_date: lastRunDate,
        last_run_at: lastRunAt,
        last_run_status: lastRunStatus,
        age_hours: ageHours,
        is_stale: isStale
      });
    } catch (error) {
      sendJson(res, 200, {
        ok: true,
        service: "fire-risk-worker",
        last_run_date: null,
        last_run_at: null,
        age_hours: null,
        is_stale: false
      });
    }
    return;
  }

  if (["/run-export", "/run-daily", "/run-pipeline"].includes(url.pathname) && req.method === "POST") {
    if (!isAuthorizedWriteRequest(req)) {
      sendJson(res, 401, {
        ok: false,
        error: "Unauthorized"
      });
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/run-export") {
    try {
      const result = await exportOperationalAssets({
        runDate: url.searchParams.get("date") || undefined
      });
      sendJson(res, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error.message
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/run-daily") {
    try {
      const result = await runDaily({
        date: url.searchParams.get("date") || undefined,
        exportFirst: parseBooleanParam(url.searchParams.get("export"))
      });
      sendJson(res, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error.message
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/run-pipeline") {
    try {
      const result = await runDaily({
        date: url.searchParams.get("date") || undefined,
        exportFirst: true
      });
      sendJson(res, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error.message
      });
    }
    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: "Not found"
  });
});

server.listen(port, host, () => {
  process.stdout.write(`Worker listening on ${host}:${port}\n`);
});