import type { Lexeme } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enrich, normalizeKey, type Enrichment } from "@/lib/ai";
import { getProvider } from "@/lib/ai/registry";
import { log } from "@/lib/log";

// Serialize array/object fields for SQLite TEXT columns.
const j = (v: unknown) => JSON.stringify(v ?? null);

function lexemeFields(e: Enrichment, source: string, model: string) {
  return {
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
  };
}

/**
 * Replace a stub lexeme with real AI output. A stub is a placeholder written
 * when the provider was missing or failing; it must not stay cached forever
 * for every user. If the provider still fails, the stub is left as it is.
 */
async function upgradeStub(existing: Lexeme): Promise<Lexeme> {
  const { enrichment: e, source, model } = await enrich(existing.text);
  if (source === "stub") return existing;

  log.info("lexeme.stub_upgraded", { key: existing.key, source });
  return prisma.lexeme.update({
    where: { id: existing.id },
    data: {
      ...lexemeFields(e, source, model),
      examples: {
        deleteMany: {},
        create: e.examples.map((x) => ({ en: x.en, translation: x.translation })),
      },
    },
  });
}

/**
 * Return the global Lexeme for `text`, creating it via the AI pipeline only if
 * it doesn't already exist (req #8: no duplicate AI calls). Concurrency-safe:
 * a race on the unique `key` is resolved by re-reading.
 */
export async function getOrCreateLexeme(text: string): Promise<Lexeme> {
  const key = normalizeKey(text);

  const existing = await prisma.lexeme.findUnique({ where: { key } });
  if (existing) {
    if (existing.source === "stub" && getProvider()) return upgradeStub(existing);
    log.info("lexeme.cache_hit", { key });
    return existing;
  }

  const { enrichment: e, source, model } = await enrich(text);

  try {
    return await prisma.lexeme.create({
      data: {
        key,
        text: text.trim(),
        ...lexemeFields(e, source, model),
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
