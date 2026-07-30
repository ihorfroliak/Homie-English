import Anthropic from "@anthropic-ai/sdk";

// Shape the app relies on. The provider seam guarantees this shape whether
// enrichment came from Claude or the offline stub.
export type Enrichment = {
  translation: string;
  ipa: string;
  uaHint: string;
  partOfSpeech: string;
  cefr: string; // A1..C2
  explanation: string; // original, educational — never copied from a dictionary
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
  notes: string; // common mistakes / learning tips
  examples: { en: string; translation: string }[];
};

const MODEL = "claude-sonnet-5";

const SYSTEM = `You are the Dictionary Expert for a Ukrainian learner of English.
Return ORIGINAL educational content only. Never copy definitions or example
sentences from any copyrighted dictionary. Translations are into Ukrainian.
Respond with a single JSON object, no prose, matching exactly:
{
 "translation": string,        // Ukrainian
 "ipa": string,                // e.g. "/teɪk/"
 "uaHint": string,             // Ukrainian pronunciation helper, e.g. "тейк"
 "partOfSpeech": string,
 "cefr": string,               // one of A1 A2 B1 B2 C1 C2
 "explanation": string,        // 1-2 simple sentences, original
 "synonyms": string[],
 "antonyms": string[],
 "collocations": string[],
 "notes": string,              // common mistakes / a learning tip
 "examples": [ { "en": string, "translation": string } ]  // 2-3 natural, original
}`;

/**
 * Enrich a word/phrase. Uses Claude when ANTHROPIC_API_KEY is present,
 * otherwise a deterministic stub so the app runs with zero configuration.
 */
export async function enrichWord(text: string): Promise<Enrichment> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return stubEnrichment(text);

  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: `Word or phrase: "${text}"` }],
  });

  const block = msg.content.find((b) => b.type === "text");
  const raw = block && "text" in block ? block.text : "";
  return parseEnrichment(raw, text);
}

function parseEnrichment(raw: string, fallbackText: string): Enrichment {
  try {
    // Tolerate code fences or stray prose around the JSON.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const json = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    const parsed = JSON.parse(json);
    const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
    return {
      translation: String(parsed.translation ?? ""),
      ipa: String(parsed.ipa ?? ""),
      uaHint: String(parsed.uaHint ?? ""),
      partOfSpeech: String(parsed.partOfSpeech ?? ""),
      cefr: String(parsed.cefr ?? ""),
      explanation: String(parsed.explanation ?? ""),
      synonyms: arr(parsed.synonyms),
      antonyms: arr(parsed.antonyms),
      collocations: arr(parsed.collocations),
      notes: String(parsed.notes ?? ""),
      examples: Array.isArray(parsed.examples)
        ? parsed.examples.map((e: { en?: unknown; translation?: unknown }) => ({
            en: String(e.en ?? ""),
            translation: String(e.translation ?? ""),
          }))
        : [],
    };
  } catch {
    // Model returned something unparseable — degrade gracefully.
    return stubEnrichment(fallbackText);
  }
}

// Offline fallback: no external content, just enough structure to exercise
// the whole loop (UI, DB, SRS) without an API key.
function stubEnrichment(text: string): Enrichment {
  return {
    translation: "",
    ipa: "",
    uaHint: "",
    partOfSpeech: "",
    cefr: "",
    explanation: `Enrichment stub for "${text}". Set ANTHROPIC_API_KEY for real AI analysis.`,
    synonyms: [],
    antonyms: [],
    collocations: [],
    notes: "",
    examples: [],
  };
}
