import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    verifyPasswordOrDummy: vi.fn(actual.verifyPasswordOrDummy),
    createSession: vi.fn(),
  };
});

import { prisma } from "@/lib/db";
import { createSession, hashPassword, verifyPasswordOrDummy } from "@/lib/auth";
import { _resetBuckets } from "@/lib/ratelimit";
import { POST } from "@/app/api/auth/login/route";

const findUser = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

const login = (email: string, password: string, ip = "1.1.1.1") =>
  POST(
    new NextRequest("http://x/api/auth/login", {
      method: "POST",
      headers: { "x-real-ip": ip },
      body: JSON.stringify({ email, password }),
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
  _resetBuckets();
});

describe("POST /api/auth/login", () => {
  it("logs in with the right password", async () => {
    const passwordHash = await hashPassword("correct horse");
    findUser.mockResolvedValue({ id: "u1", email: "a@b.co", name: null, passwordHash });

    const res = await login("a@b.co", "correct horse");
    expect(res.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith("u1");
  });

  it("rejects a wrong password", async () => {
    const passwordHash = await hashPassword("correct horse");
    findUser.mockResolvedValue({ id: "u1", email: "a@b.co", name: null, passwordHash });

    expect((await login("a@b.co", "wrong")).status).toBe(401);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("does the same hashing work for an unknown email", async () => {
    findUser.mockResolvedValue(null);

    const res = await login("nobody@b.co", "whatever");
    expect(res.status).toBe(401);
    expect(verifyPasswordOrDummy).toHaveBeenCalledWith("whatever", null);
    await expect(verifyPasswordOrDummy("whatever", null)).resolves.toBe(false);
  });

  it("limits guesses per account, even from rotating IPs", async () => {
    findUser.mockResolvedValue(null);
    for (let i = 0; i < 10; i++) {
      expect((await login("a@b.co", "x", `9.9.9.${i}`)).status).toBe(401);
    }
    const res = await login("a@b.co", "x", "8.8.8.8");
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
