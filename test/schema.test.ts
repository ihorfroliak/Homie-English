import { describe, it, expect } from "vitest";
import { EnrichmentSchema, normalizeKey } from "@/lib/ai/schema";

const valid = {
  lemma: "run",
  partOfSpeech: "verb",
  cefr: "A2",
  ipaUk: "/rʌn/",
  ipaUs: "/rʌn/",
  translation: "бігти",
  explanation: "To move quickly on foot.",
  examples: [
    { en: "I run every morning.", translation: "Я бігаю щоранку." },
    { en: "She ran to the bus.", translation: "Вона побігла до автобуса." },
    { en: "They run a shop.", translation: "Вони керують магазином." },
  ],
};

describe("EnrichmentSchema", () => {
  it("accepts a valid entry and applies array defaults", () => {
    const e = EnrichmentSchema.parse(valid);
    expect(e.synonyms).toEqual([]);
    expect(e.altTranslations).toEqual([]);
    expect(e.plural).toBeNull();
    expect(e.pronunciationTips).toBe("");
  });

  it("rejects a bad CEFR level", () => {
    expect(() => EnrichmentSchema.parse({ ...valid, cefr: "Z9" })).toThrow();
  });

  it("rejects when there are too few examples", () => {
    expect(() =>
      EnrichmentSchema.parse({ ...valid, examples: [valid.examples[0]] })
    ).toThrow();
  });

  it("rejects a missing required field", () => {
    const { translation, ...rest } = valid;
    void translation;
    expect(() => EnrichmentSchema.parse(rest)).toThrow();
  });
});

describe("normalizeKey", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeKey("  Take   Responsibility ")).toBe("take responsibility");
  });
});
