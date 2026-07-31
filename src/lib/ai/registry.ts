import type { EnrichmentProvider } from "./types";
import { stubProvider } from "./providers/stub";
import { createAnthropicProvider } from "./providers/anthropic";

// SINGLE registration point. To switch the app to OpenAI / Gemini / a local
// model, add a factory to this map and set AI_PROVIDER — nothing else changes.
type Factory = () => EnrichmentProvider | null;

const registry: Record<string, Factory> = {
  anthropic: () => {
    const key = process.env.ANTHROPIC_API_KEY;
    return key ? createAnthropicProvider(key) : null;
  },
  stub: () => stubProvider,
  // openai: () => { const k = process.env.OPENAI_API_KEY; return k ? createOpenAIProvider(k) : null; },
  // gemini: () => { ... },
};

/** The active real provider, or null when none is configured/available. */
export function getProvider(): EnrichmentProvider | null {
  const name = process.env.AI_PROVIDER ?? "anthropic";
  const factory = registry[name] ?? registry.anthropic;
  return factory();
}

export { stubProvider };
