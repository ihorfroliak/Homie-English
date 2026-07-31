import { describe, it, expect, beforeEach, vi } from "vitest";
import { enrichWith } from "@/lib/ai";
import { _reset } from "@/lib/ai/ratelimit";
import type { EnrichmentProvider } from "@/lib/ai/types";
import type { Enrichment } from "@/lib/ai/schema";

const good: Enrichment = {
  lemma: "ok",
  partOfSpeech: "noun",
  cefr: "B1",
  ipaUk: "/əʊˈkeɪ/",
  ipaUs: "/oʊˈkeɪ/",
  translation: "гаразд",
  altTranslations: [],
  explanation: "Fine.",
  examples: [
    { en: "It is ok.", translation: "Це гаразд." },
    { en: "All ok here.", translation: "Тут усе гаразд." },
    { en: "Ok, let's go.", translation: "Гаразд, ходімо." },
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

function provider(
  name: string,
  fn: (n: number) => Promise<Enrichment>
): EnrichmentProvider {
  let calls = 0;
  return {
    name,
    model: "test",
    enrich: async () => fn(++calls),
  };
}

describe("enrichWith orchestration", () => {
  beforeEach(() => _reset());

  it("falls back to the stub when there is no provider", async () => {
    const r = await enrichWith(null, "word");
    expect(r.source).toBe("stub");
  });

  it("returns provider output on success", async () => {
    const p = provider("anthropic", async () => good);
    const r = await enrichWith(p, "ok");
    expect(r.source).toBe("anthropic");
    expect(r.enrichment.translation).toBe("гаразд");
  });

  it("retries once, then succeeds", async () => {
    const spy = vi.fn();
    const p = provider("anthropic", async (n) => {
      spy(n);
      if (n === 1) throw new Error("bad json");
      return good;
    });
    const r = await enrichWith(p, "ok");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(r.source).toBe("anthropic");
  });

  it("falls back to the stub after two failures", async () => {
    const p = provider("anthropic", async () => {
      throw new Error("always fails");
    });
    const r = await enrichWith(p, "ok");
    expect(r.source).toBe("stub");
  });
});
