import { describe, it, expect } from "vitest";
import { stubProvider } from "@/lib/ai/providers/stub";
import { EnrichmentSchema } from "@/lib/ai/schema";

describe("stubProvider", () => {
  it("produces schema-valid output with no network", async () => {
    const out = await stubProvider.enrich("serendipity", new AbortController().signal);
    expect(() => EnrichmentSchema.parse(out)).not.toThrow();
    expect(out.lemma).toBe("serendipity");
    expect(out.examples.length).toBeGreaterThanOrEqual(3);
  });
});
