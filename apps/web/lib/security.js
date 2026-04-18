import "server-only";

import crypto from "node:crypto";

export function constantTimeEqual(left = "", right = "") {
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

export function getClientIpFromHeaders(headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}