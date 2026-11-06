import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB and the AI orchestrator; keep the real normalizeKey.
vi.mock("@/lib/db", () => ({
  prisma: { lexeme: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/ai/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/registry")>();
  return { ...actual, getProvider: vi.fn() };
});
vi.mock("@/lib/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai")>();
  return { ...actual, enrich: vi.fn() };
});

import { prisma } from "@/lib/db";
import { enrich } from "@/lib/ai";
import { getProvider } from "@/lib/ai/registry";
import { getOrCreateLexeme } from "@/lib/enrichment";

const findUnique = prisma.lexeme.findUnique as unknown as ReturnType<typeof vi.fn>;
const create = prisma.lexeme.create as unknown as ReturnType<typeof vi.fn>;
const update = prisma.lexeme.update as unknown as ReturnType<typeof vi.fn>;
const enrichMock = enrich as unknown as ReturnType<typeof vi.fn>;
const getProviderMock = getProvider as unknown as ReturnType<typeof vi.fn>;

const realEnrichment = {
  lemma: "run",
  partOfSpeech: "verb",
  cefr: "A2",
  ipaUk: "/rʌn/",
  ipaUs: "/rʌn/",
  translation: "бігти",
  altTranslations: [],
  explanation: "move fast",
  examples: [{ en: "I run.", translation: "Я біжу." }],
  collocations: [],
  commonMistakes: [],
  synonyms: [],
  antonyms: [],
  irregularForms: null,
  plural: null,
  verbForms: null,
  pronunciationTips: "",
  mnemonic: "",
  tags: [],
};

beforeEach(() => vi.clearAllMocks());

describe("getOrCreateLexeme", () => {
  it("reuses an existing lexeme without calling the AI (dedupe)", async () => {
    findUnique.mockResolvedValue({ id: "lx1", key: "run", text: "run" });

    const lx = await getOrCreateLexeme("Run");

    expect(lx.id).toBe("lx1");
    expect(enrichMock).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("enriches and persists a new lexeme on a cache miss", async () => {
    findUnique.mockResolvedValue(null);
    enrichMock.mockResolvedValue({
      enrichment: {
        lemma: "run",
        partOfSpeech: "verb",
        cefr: "A2",
        ipaUk: "/rʌn/",
        ipaUs: "/rʌn/",
        translation: "бігти",
        altTranslations: [],
        explanation: "move fast",
        examples: [{ en: "I run.", translation: "Я біжу." }],
        collocations: [],
        commonMistakes: [],
        synonyms: [],
        antonyms: [],
        irregularForms: null,
        plural: null,
        verbForms: null,
        pronunciationTips: "",
        mnemonic: "",
        tags: [],
      },
      source: "anthropic",
      model: "claude-sonnet-5",
    });
    create.mockResolvedValue({ id: "lx2", key: "run", text: "run" });

    const lx = await getOrCreateLexeme("run");

    expect(enrichMock).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].data.source).toBe("anthropic");
    expect(lx.id).toBe("lx2");
  });

  describe("stub lexemes", () => {
    const stubRow = { id: "lx3", key: "run", text: "run", source: "stub" };

    it("are upgraded in place once a real provider answers", async () => {
      findUnique.mockResolvedValue(stubRow);
      getProviderMock.mockReturnValue({ name: "anthropic" });
      enrichMock.mockResolvedValue({
        enrichment: realEnrichment,
        source: "anthropic",
        model: "m",
      });
      update.mockResolvedValue({ ...stubRow, source: "anthropic" });

      const lx = await getOrCreateLexeme("run");

      expect(lx.source).toBe("anthropic");
      const args = update.mock.calls[0][0];
      expect(args.where).toEqual({ id: "lx3" });
      expect(args.data.examples.deleteMany).toEqual({});
      expect(args.data.examples.create).toHaveLength(1);
      expect(create).not.toHaveBeenCalled();
    });

    it("stay untouched if the provider still falls back", async () => {
      findUnique.mockResolvedValue(stubRow);
      getProviderMock.mockReturnValue({ name: "anthropic" });
      enrichMock.mockResolvedValue({
        enrichment: realEnrichment,
        source: "stub",
        model: "stub",
      });

      expect(await getOrCreateLexeme("run")).toBe(stubRow);
      expect(update).not.toHaveBeenCalled();
    });

    it("don't attempt anything with no provider configured", async () => {
      findUnique.mockResolvedValue(stubRow);
      getProviderMock.mockReturnValue(null);

      expect(await getOrCreateLexeme("run")).toBe(stubRow);
      expect(enrichMock).not.toHaveBeenCalled();
    });

    it("real lexemes never re-enrich", async () => {
      findUnique.mockResolvedValue({ ...stubRow, source: "anthropic" });
      getProviderMock.mockReturnValue({ name: "anthropic" });

      await getOrCreateLexeme("run");
      expect(enrichMock).not.toHaveBeenCalled();
    });
  });
});
