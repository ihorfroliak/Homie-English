// In-process, fixed-window limiter for abuse-prone routes (auth, AI spend).
// Per-instance only: multi-instance prod needs a shared store (Redis) behind
// this same signature.
type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 50_000;
const buckets = new Map<string, Bucket>();

export type RateResult = { ok: boolean; retryAfterSec: number };

export function hit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now()
): RateResult {
  // Bound memory: attacker-chosen keys (emails, IPs) must not grow this forever.
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
  }

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count++;
  return {
    ok: b.count <= max,
    retryAfterSec: b.count <= max ? 0 : Math.ceil((b.resetAt - now) / 1000),
  };
}

/** Client IP as reported by the proxy. Spoofable without a trusted proxy. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

export function tooManyRequests(retryAfterSec: number): Response {
  return Response.json(
    { error: "Too many requests. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

// Test/reset helper.
export function _resetBuckets() {
  buckets.clear();
}
