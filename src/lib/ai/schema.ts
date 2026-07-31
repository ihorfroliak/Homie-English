import { z } from "zod";

// The contract every provider must satisfy. LLM output is NEVER trusted — it is
// parsed against this schema, and only a successful parse is accepted.
// Kept lenient on counts (min bounds, not exact) so a good-but-imperfect
// response is used rather than discarded, while still guaranteeing shape.

const CEFR = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

const Example = z.object({
  en: z.string().min(1).max(300),
  translation: z.string().min(1).max(300),
});

const VerbForms = z
  .object({
    base: z.string().optional(),
    thirdPersonSingular: z.string().optional(),
    pastSimple: z.string().optional(),
    pastParticiple: z.string().optional(),
    presentParticiple: z.string().optional(),
  })
  .nullable()
  .optional();

export const EnrichmentSchema = z.object({
  lemma: z.string().min(1).max(120),
  partOfSpeech: z.string().min(1).max(60),
  cefr: CEFR,
  ipaUk: z.string().min(1).max(120),
  ipaUs: z.string().min(1).max(120),
  translation: z.string().min(1).max(200),
  altTranslations: z.array(z.string().min(1).max(200)).max(8).default([]),
  explanation: z.string().min(1).max(600),
  examples: z.array(Example).min(3).max(6),
  collocations: z.array(z.string().min(1).max(120)).max(15).default([]),
  commonMistakes: z.array(z.string().min(1).max(300)).max(10).default([]),
  synonyms: z.array(z.string().min(1).max(120)).max(15).default([]),
  antonyms: z.array(z.string().min(1).max(120)).max(15).default([]),
  irregularForms: z.string().max(300).nullable().default(null),
  plural: z.string().max(120).nullable().default(null),
  verbForms: VerbForms,
  pronunciationTips: z.string().max(400).default(""),
  mnemonic: z.string().max(400).default(""),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
});

export type Enrichment = z.infer<typeof EnrichmentSchema>;

// Normalize input into the global dedup key: lowercase, trim, collapse spaces.
export function normalizeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
