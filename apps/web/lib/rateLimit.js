import "server-only";

const rateLimitBuckets = new Map();
const MAX_BUCKETS = 5000;

function pruneExpired(now) {
  for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(bucketKey);
    }
  }

  if (rateLimitBuckets.size <= MAX_BUCKETS) {
    return;
  }

  const overflow = rateLimitBuckets.size - MAX_BUCKETS;
  for (const bucketKey of rateLimitBuckets.keys()) {
    rateLimitBuckets.delete(bucketKey);
    if (rateLimitBuckets.size <= MAX_BUCKETS - overflow) {
      break;
    }
  }
}

export function checkRateLimit(bucketName, key, { windowMs, max }) {
  const now = Date.now();
  pruneExpired(now);

  const normalizedBucket = String(bucketName || "default");
  const normalizedKey = String(key || "unknown");
  const bucketId = `${normalizedBucket}:${normalizedKey}`;
  const current = rateLimitBuckets.get(bucketId);

  if (!current || current.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs
    };
    rateLimitBuckets.set(bucketId, next);
    return {
      ok: true,
      remaining: Math.max(max - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  if (current.count >= max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1)
    };
  }

  current.count += 1;
  rateLimitBuckets.set(bucketId, current);

  return {
    ok: true,
    remaining: Math.max(max - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1)
  };
}