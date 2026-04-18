import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  buildAdminCookieOptions,
  buildAdminSessionToken,
  isAdminConfigured
} from "../../../../lib/adminAuth";
import { checkRateLimit } from "../../../../lib/rateLimit";
import { getClientIpFromHeaders, constantTimeEqual, readJsonBody } from "../../../../lib/security";
import { getServerEnv } from "../../../../lib/serverEnv";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

export async function POST(request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Admin access is not configured." },
      { status: 503 }
    );
  }

  const clientIp = getClientIpFromHeaders(request.headers);
  const rateLimit = checkRateLimit("admin-login", clientIp, {
    windowMs: LOGIN_WINDOW_MS,
    max: LOGIN_MAX_ATTEMPTS
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const body = await readJsonBody(request);
  const submittedPassword = typeof body?.password === "string" ? body.password : "";
  const adminPassword = getServerEnv("ADMIN_DASHBOARD_PASSWORD", "");

  if (!submittedPassword || !constantTimeEqual(submittedPassword, adminPassword)) {
    return NextResponse.json(
      { ok: false, error: "Invalid password." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    buildAdminSessionToken(),
    buildAdminCookieOptions()
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...buildAdminCookieOptions(),
    maxAge: 0
  });
  return response;
}