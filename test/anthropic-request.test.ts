import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

import { createAnthropicProvider } from "@/lib/ai/providers/anthropic";

const signal = new AbortController().signal;
const valid = {
  lemma: "run",
  partOfSpeech: "verb",
  cefr: "A2",
  ipaUk: "/rʌn/",
  ipaUs: "/rʌn/",
  translation: "бігти",
  altTranslations: [],
  explanation: "move fast",
  examples: Array.from({ length: 5 }, (_, i) => ({
    en: `I run ${i}.`,
    translation: `Я біжу ${i}.`,
  })),
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

const reply = (stop_reason: string, text = JSON.stringify(valid)) => ({
  stop_reason,
  content: [{ type: "text", text }],
});

beforeEach(() => create.mockReset());

describe("anthropic provider", () => {
  it("sends no sampling params, which current models reject with a 400", async () => {
    create.mockResolvedValue(reply("end_turn"));
    await createAnthropicProvider("k").enrich("run", signal);

    const params = create.mock.calls[0][0];
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("top_p");
    expect(params).not.toHaveProperty("top_k");
  });

  it("returns validated output", async () => {
    create.mockResolvedValue(reply("end_turn"));
    const out = await createAnthropicProvider("k").enrich("run", signal);
    expect(out.translation).toBe("бігти");
  });

  it.each(["refusal", "max_tokens"])("throws on stop_reason %s", async (stop) => {
    create.mockResolvedValue(reply(stop));
    await expect(
      createAnthropicProvider("k").enrich("run", signal)
    ).rejects.toThrow(stop);
  });
});
