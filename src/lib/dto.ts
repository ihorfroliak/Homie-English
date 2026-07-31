import type { Lexeme, Word, Example } from "@prisma/client";

type WordWithLexeme = Word & { lexeme: Lexeme & { examples: Example[] } };

const arr = (s: string | null): string[] => {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

const obj = (s: string | null): Record<string, unknown> | null => {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
};

// Flatten the per-user Word + shared Lexeme into a single client-facing DTO.
export function toWordDTO(w: WordWithLexeme) {
  const lx = w.lexeme;
  return {
    id: w.id,
    text: lx.text,
    lemma: lx.lemma,
    partOfSpeech: lx.partOfSpeech,
    cefr: lx.cefr,
    ipaUk: lx.ipaUk,
    ipaUs: lx.ipaUs,
    translation: lx.translation,
    altTranslations: arr(lx.altTranslations),
    explanation: lx.explanation,
    examples: lx.examples.map((e) => ({
      id: e.id,
      en: e.en,
      translation: e.translation,
    })),
    collocations: arr(lx.collocations),
    commonMistakes: arr(lx.commonMistakes),
    synonyms: arr(lx.synonyms),
    antonyms: arr(lx.antonyms),
    tags: arr(lx.tags),
    irregularForms: lx.irregularForms,
    plural: lx.plural,
    verbForms: obj(lx.verbForms),
    pronunciationTips: lx.pronunciationTips,
    mnemonic: lx.mnemonic,
    status: w.status,
    difficulty: w.difficulty,
    reps: w.reps,
    intervalDays: w.intervalDays,
    dueAt: w.dueAt,
  };
}

export type WordDTO = ReturnType<typeof toWordDTO>;
