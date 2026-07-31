import type { EnrichmentProvider } from "../types";
import type { Enrichment } from "../schema";

// Deterministic offline fallback. No external content, no network. Returns a
// valid-shaped entry so the whole loop (DB, SRS, UI) works with no API key or
// when the real provider fails.
export const stubProvider: EnrichmentProvider = {
  name: "stub",
  model: "stub",
  async enrich(text: string): Promise<Enrichment> {
    return {
      lemma: text.trim().toLowerCase(),
      partOfSpeech: "unknown",
      cefr: "B1",
      ipaUk: "—",
      ipaUs: "—",
      translation: "—",
      altTranslations: [],
      explanation: `Enrichment unavailable for "${text}". Set ANTHROPIC_API_KEY for AI analysis.`,
      examples: [
        { en: `Here is "${text}" in a sentence.`, translation: "—" },
        { en: `You can also use "${text}" like this.`, translation: "—" },
        { en: `Another example with "${text}".`, translation: "—" },
      ],
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
  },
};
