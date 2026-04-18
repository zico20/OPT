import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { constantTimeEqual } from "./security";
import { getServerEnv } from "./serverEnv";

export const ADMIN_SESSION_COOKIE = "hazardsignal_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
const ADMIN_SESSION_SUBJECT = "hazardsignal-admin";

function getAdminPassword() {
  return getServerEnv("ADMIN_DASHBOARD_PASSWORD", "");
}

function getAdminSessionSecret() {
  return getServerEnv("ADMIN_SESSION_SECRET", "");
}

function createSessionSignature(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword() && getAdminSessionSecret());
}

export function buildAdminSessionToken(nowMs = Date.now()) {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return "";
  }

  const issuedAt = Math.floor(nowMs / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: ADMIN_SESSION_SUBJECT,
      iat: issuedAt,
      exp: issuedAt + ADMIN_SESSION_TTL_SECONDS
    }),
    "utf8"
  ).toString("base64url");

  const signature = createSessionSignature(payload, secret);
  return `${payload}.${signature}`;
}

function verifyAdminSessionToken(token) {
  const secret = getAdminSessionSecret();
  if (!secret || !token || !token.includes(".")) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = createSessionSignature(payload, secret);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);

    return (
      decoded.sub === ADMIN_SESSION_SUBJECT &&
      Number.isInteger(decoded.iat) &&
      Number.isInteger(decoded.exp) &&
      decoded.iat <= now + 60 &&
      decoded.exp >= now
    );
  } catch (error) {
    return false;
  }
}

export async function isAdminAuthenticated() {
  if (!isAdminConfigured()) {
    return false;
  }

  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value || "";
  return verifyAdminSessionToken(token);
}

export async function requireAdminPage(locale = "en") {
  if (!(await isAdminAuthenticated())) {
    redirect(`/${locale}/admin/login`);
  }
}

export async function requireAdminApi() {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Admin access is not configured." },
      { status: 503 }
    );
  }

  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}

export function buildAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS
  };
}