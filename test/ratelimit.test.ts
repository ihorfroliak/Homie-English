import { describe, it, expect, beforeEach } from "vitest";
import { _resetBuckets, clientIp, hit, tooManyRequests } from "@/lib/ratelimit";

beforeEach(() => _resetBuckets());

describe("hit", () => {
  it("allows up to max, then blocks with a retry hint", () => {
    expect(hit("k", 2, 1000, 0).ok).toBe(true);
    expect(hit("k", 2, 1000, 1).ok).toBe(true);
    const blocked = hit("k", 2, 1000, 2);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
  });

  it("opens again after the window", () => {
    hit("k", 1, 1000, 0);
    expect(hit("k", 1, 1000, 500).ok).toBe(false);
    expect(hit("k", 1, 1000, 1000).ok).toBe(true);
  });

  it("isolates keys", () => {
    hit("a", 1, 1000, 0);
    expect(hit("b", 1, 1000, 0).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip, then the first forwarded hop", () => {
    const req = (headers: Record<string, string>) =>
      new Request("http://x", { headers });
    expect(clientIp(req({ "x-real-ip": "1.1.1.1" }))).toBe("1.1.1.1");
    expect(clientIp(req({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(clientIp(req({}))).toBe("local");
  });
});

describe("tooManyRequests", () => {
  it("is a 429 with Retry-After", () => {
    const res = tooManyRequests(7);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("7");
  });
});
