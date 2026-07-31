import type { Enrichment } from "./schema";

// One method to implement per provider. It performs a single attempt and
// returns validated Enrichment, or throws (network error, timeout, or invalid
// output). Orchestration (retry, fallback, logging) lives in ./index.
export interface EnrichmentProvider {
  readonly name: string; // "anthropic" | "openai" | "gemini" | "stub" | ...
  readonly model: string;
  enrich(text: string, signal: AbortSignal): Promise<Enrichment>;
}
