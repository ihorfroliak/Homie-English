import Anthropic from "@anthropic-ai/sdk";
import type { EnrichmentProvider } from "../types";
import { EnrichmentSchema, type Enrichment } from "../schema";
import { SYSTEM_PROMPT, userPrompt } from "../prompt";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

// Extract the first balanced JSON object, tolerating stray prose or fences.
export function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in response");
  return raw.slice(start, end + 1);
}

export function createAnthropicProvider(apiKey: string): EnrichmentProvider {
  // SDK-level maxRetries handles transient 429/5xx with backoff; our own
  // orchestrator adds one retry specifically for validation failures.
  const client = new Anthropic({ apiKey, maxRetries: 2 });

  return {
    name: "anthropic",
    model: MODEL,
    async enrich(text: string, signal: AbortSignal): Promise<Enrichment> {
      const msg = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 2048,
          temperature: 0.4,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt(text) }],
        },
        { signal }
      );

      const block = msg.content.find((b) => b.type === "text");
      const raw = block && "text" in block ? block.text : "";
      // Throws if the model returned invalid JSON or a bad shape — the
      // orchestrator turns that into a retry, then a stub fallback.
      return EnrichmentSchema.parse(JSON.parse(extractJson(raw)));
    },
  };
}
