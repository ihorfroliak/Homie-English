import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { word: { findMany: vi.fn() } },
}));

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GET } from "@/app/api/words/route";

const getUser = getSessionUser as unknown as ReturnType<typeof vi.fn>;
const findMany = prisma.word.findMany as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe("GET /api/words", () => {
  it("returns 401 when there is no session", async () => {
    getUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user's words as DTOs", async () => {
    getUser.mockResolvedValue({ id: "u1", email: "a@b.c", name: null });
    findMany.mockResolvedValue([
      {
        id: "w1",
        status: "New",
        difficulty: "Medium",
        reps: 0,
        intervalDays: 0,
        dueAt: new Date(),
        lexeme: {
          text: "run",
          lemma: "run",
          partOfSpeech: "verb",
          cefr: "A2",
          ipaUk: "/rʌn/",
          ipaUs: "/rʌn/",
          translation: "бігти",
          altTranslations: "[]",
          explanation: "move fast",
          collocations: "[]",
          commonMistakes: "[]",
          synonyms: "[]",
          antonyms: "[]",
          tags: "[]",
          irregularForms: null,
          plural: null,
          verbForms: null,
          pronunciationTips: "",
          mnemonic: "",
          examples: [],
        },
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.words).toHaveLength(1);
    expect(body.words[0].text).toBe("run");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
  });
});
