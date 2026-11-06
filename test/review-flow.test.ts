import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db", () => {
  const word = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  };
  const reviewLog = { create: vi.fn() };
  return {
    prisma: {
      word,
      reviewLog,
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({ word, reviewLog })),
    },
  };
});

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { POST as review } from "@/app/api/words/[id]/review/route";
import { DELETE as remove } from "@/app/api/words/[id]/route";
import { GET as queue } from "@/app/api/review/route";

const mock = (f: unknown) => f as ReturnType<typeof vi.fn>;
const getUser = mock(getSessionUser);
const word = prisma.word as unknown as Record<string, ReturnType<typeof vi.fn>>;
const logCreate = mock(prisma.reviewLog.create);

const lexeme = {
  text: "run",
  lemma: "run",
  source: "anthropic",
  altTranslations: "[]",
  collocations: "[]",
  commonMistakes: "[]",
  synonyms: "[]",
  antonyms: "[]",
  tags: "[]",
  verbForms: null,
  examples: [],
};
const past = new Date(Date.now() - 1000);
const future = new Date(Date.now() + 864e5);
const row = (over = {}) => ({
  id: "w1",
  userId: "u1",
  status: "New",
  difficulty: "Medium",
  reps: 0,
  intervalDays: 0,
  dueAt: past,
  lexeme,
  ...over,
});

const ctx = { params: Promise.resolve({ id: "w1" }) };
const post = (grade: string) =>
  review(
    new NextRequest("http://x/api/words/w1/review", {
      method: "POST",
      body: JSON.stringify({ grade }),
    }),
    ctx
  );

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "u1", email: "a@b.c", name: null });
});

describe("POST /api/words/:id/review", () => {
  it("requires a session", async () => {
    getUser.mockResolvedValue(null);
    expect((await post("good")).status).toBe(401);
  });

  it("scopes the lookup to the owner (no IDOR)", async () => {
    word.findFirst.mockResolvedValue(null);
    expect((await post("good")).status).toBe(404);
    expect(word.findFirst).toHaveBeenCalledWith({
      where: { id: "w1", userId: "u1" },
    });
    expect(word.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a word that is not due, so 'good' can't be farmed", async () => {
    word.findFirst.mockResolvedValue(row({ dueAt: future }));
    expect((await post("good")).status).toBe(409);
    expect(word.updateMany).not.toHaveBeenCalled();
    expect(logCreate).not.toHaveBeenCalled();
  });

  it("advances a due word and logs the review", async () => {
    word.findFirst.mockResolvedValue(row());
    word.updateMany.mockResolvedValue({ count: 1 });
    word.findUnique.mockResolvedValue(row({ reps: 1, status: "Learning" }));

    const res = await post("good");
    expect(res.status).toBe(200);
    expect((await res.json()).word.reps).toBe(1);

    const args = word.updateMany.mock.calls[0][0];
    expect(args.where.userId).toBe("u1");
    expect(args.where.dueAt).toHaveProperty("lte");
    expect(args.data.intervalDays).toBe(1);
    expect(logCreate).toHaveBeenCalledWith({
      data: { userId: "u1", wordId: "w1", grade: "good" },
    });
  });

  it("does not log when a concurrent submit already advanced it", async () => {
    word.findFirst.mockResolvedValue(row());
    word.updateMany.mockResolvedValue({ count: 0 });
    expect((await post("good")).status).toBe(409);
    expect(logCreate).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/words/:id", () => {
  const del = () =>
    remove(new NextRequest("http://x/api/words/w1", { method: "DELETE" }), ctx);

  it("deletes only the caller's word", async () => {
    word.deleteMany.mockResolvedValue({ count: 1 });
    expect((await del()).status).toBe(204);
    expect(word.deleteMany).toHaveBeenCalledWith({
      where: { id: "w1", userId: "u1" },
    });
  });

  it("is a 404 for someone else's word", async () => {
    word.deleteMany.mockResolvedValue({ count: 0 });
    expect((await del()).status).toBe(404);
  });

  it("requires a session", async () => {
    getUser.mockResolvedValue(null);
    expect((await del()).status).toBe(401);
    expect(word.deleteMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/review", () => {
  it("returns only the caller's due words, most overdue first", async () => {
    word.findMany.mockResolvedValue([row()]);
    word.count.mockResolvedValue(1);

    const res = await queue();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.due).toBe(1);
    expect(body.words[0].id).toBe("w1");

    const args = word.findMany.mock.calls[0][0];
    expect(args.where.userId).toBe("u1");
    expect(args.where.dueAt).toHaveProperty("lte");
    expect(args.orderBy).toEqual({ dueAt: "asc" });
  });

  it("requires a session", async () => {
    getUser.mockResolvedValue(null);
    expect((await queue()).status).toBe(401);
  });
});
