// Simple in-process rate limiter, ready to guard provider calls. Defaults are
// generous; tune via AI_MAX_RPM. For multi-instance prod, back this with Redis
// — the call sites don't change.
const MAX_RPM = Number(process.env.AI_MAX_RPM ?? 60);
const WINDOW_MS = 60_000;

let hits: number[] = [];

export function tryAcquire(now = Date.now()): boolean {
  hits = hits.filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_RPM) return false;
  hits.push(now);
  return true;
}

// Test/reset helper.
export function _reset() {
  hits = [];
}
