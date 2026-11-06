import { log } from "@/lib/log";
import type { EnrichmentProvider } from "./types";
import type { Enrichment } from "./schema";
import { getProvider, stubProvider } from "./registry";
import { tryAcquire } from "./ratelimit";

export type { Enrichment } from "./schema";
export { normalizeKey } from "./schema";

const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 60_000);

export type EnrichResult = {
  enrichment: Enrichment;
  source: string; // provider name that produced it ("stub" if it fell back)
  model: string;
};

async function attempt(
  provider: EnrichmentProvider,
  text: string
): Promise<Enrichment> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await provider.enrich(text, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Provider-agnostic enrichment with strong failure handling:
 * timeout, rate-limit guard, ONE retry on error/invalid output, then a
 * guaranteed stub fallback. Never throws.
 */
export async function enrich(text: string): Promise<EnrichResult> {
  return enrichWith(getProvider(), text);
}

/** Same as `enrich`, but with the provider injected (used in tests). */
export async function enrichWith(
  provider: EnrichmentProvider | null,
  text: string
): Promise<EnrichResult> {
  if (!provider) {
    log.info("enrich.stub", { reason: "no_provider", text });
    return stubFallback(text);
  }

  if (!tryAcquire()) {
    log.warn("enrich.ratelimited", { provider: provider.name, text });
    return stubFallback(text);
  }

  const started = Date.now();
  for (let tryNo = 1; tryNo <= 2; tryNo++) {
    try {
      const enrichment = await attempt(provider, text);
      log.info("enrich.ok", {
        provider: provider.name,
        model: provider.model,
        tryNo,
        ms: Date.now() - started,
        text,
      });
      return { enrichment, source: provider.name, model: provider.model };
    } catch (err) {
      log.warn("enrich.attempt_failed", {
        provider: provider.name,
        tryNo,
        ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
        text,
      });
    }
  }

  log.error("enrich.fallback", { provider: provider.name, text });
  return stubFallback(text);
}

async function stubFallback(text: string): Promise<EnrichResult> {
  return {
    enrichment: await stubProvider.enrich(text, new AbortController().signal),
    source: stubProvider.name,
    model: stubProvider.model,
  };
}
