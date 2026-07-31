import type { Lexeme } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enrich, normalizeKey } from "@/lib/ai";
import { log } from "@/lib/log";

// Serialize array/object fields for SQLite TEXT columns.
const j = (v: unknown) => JSON.stringify(v ?? null);

/**
 * Return the global Lexeme for `text`, creating it via the AI pipeline only if
 * it doesn't already exist (req #8: no duplicate AI calls). Concurrency-safe:
 * a race on the unique `key` is resolved by re-reading.
 */
export async function getOrCreateLexeme(text: string): Promise<Lexeme> {
  const key = normalizeKey(text);

  const existing = await prisma.lexeme.findUnique({ where: { key } });
  if (existing) {
    log.info("lexeme.cache_hit", { key });
    return existing;
  }

  const { enrichment: e, source, model } = await enrich(text);

  try {
    return await prisma.lexeme.create({
      data: {
        key,
        text: text.trim(),
        lemma: e.lemma,
        partOfSpeech: e.partOfSpeech,
        cefr: e.cefr,
        ipaUk: e.ipaUk,
        ipaUs: e.ipaUs,
        translation: e.translation,
        altTranslations: j(e.altTranslations),
        explanation: e.explanation,
        collocations: j(e.collocations),
        commonMistakes: j(e.commonMistakes),
        synonyms: j(e.synonyms),
        antonyms: j(e.antonyms),
        tags: j(e.tags),
        irregularForms: e.irregularForms,
        plural: e.plural,
        verbForms: e.verbForms ? j(e.verbForms) : null,
        pronunciationTips: e.pronunciationTips,
        mnemonic: e.mnemonic,
        source,
        model,
        examples: {
          create: e.examples.map((x) => ({ en: x.en, translation: x.translation })),
        },
      },
    });
  } catch (err) {
    // Lost a create race on the unique key — the other writer won; reuse it.
    const raced = await prisma.lexeme.findUnique({ where: { key } });
    if (raced) return raced;
    throw err;
  }
}
