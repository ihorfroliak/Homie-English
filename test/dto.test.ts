import { describe, it, expect } from "vitest";
import { toWordDTO } from "@/lib/dto";

// Minimal Word+Lexeme+Example shape (only the fields the mapper reads).
const row = {
  id: "w1",
  status: "Learning",
  difficulty: "Medium",
  reps: 1,
  intervalDays: 3,
  dueAt: new Date("2030-01-01"),
  lexeme: {
    text: "run",
    lemma: "run",
    partOfSpeech: "verb",
    cefr: "A2",
    ipaUk: "/rʌn/",
    ipaUs: "/rʌn/",
    translation: "бігти",
    altTranslations: '["мчати"]',
    explanation: "move fast",
    collocations: '["run late"]',
    commonMistakes: "not-json",
    synonyms: '["sprint"]',
    antonyms: "[]",
    tags: '["sport"]',
    irregularForms: null,
    plural: null,
    verbForms: '{"pastSimple":"ran"}',
    pronunciationTips: "",
    mnemonic: "",
    examples: [{ id: "e1", en: "I run.", translation: "Я біжу." }],
  },
} as unknown as Parameters<typeof toWordDTO>[0];

describe("toWordDTO", () => {
  it("parses JSON arrays and objects, flattening the lexeme", () => {
    const dto = toWordDTO(row);
    expect(dto.altTranslations).toEqual(["мчати"]);
    expect(dto.synonyms).toEqual(["sprint"]);
    expect(dto.verbForms).toEqual({ pastSimple: "ran" });
    expect(dto.examples[0].en).toBe("I run.");
    expect(dto.status).toBe("Learning");
  });

  it("degrades gracefully on malformed JSON", () => {
    expect(toWordDTO(row).commonMistakes).toEqual([]);
  });
});
