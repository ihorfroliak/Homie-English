# Homie English

AI-powered English vocabulary learning. Add a word or phrase → AI enriches it
(lemma, part of speech, CEFR, UK/US IPA, natural Ukrainian translation +
alternatives, original explanation, 5 examples, collocations, common mistakes,
synonyms/antonyms, forms, pronunciation tips, mnemonic, tags) → it lands in your
personal dictionary with a spaced-repetition schedule.

Part of the **Homie** ecosystem (Coffee, HeyHomie, Homies, Homie English).

## Stack

- **Next.js 15** (App Router) — UI + API routes, one full-stack app
- **TypeScript** (strict) + **Tailwind CSS** (light/dark)
- **Prisma** ORM — **SQLite** for local dev, one-line swap to Postgres
- **Anthropic Claude** for enrichment, behind a provider seam with an
  offline stub so the app runs with **no API key**
- **Vitest** — unit, provider, validation, and API tests

## Run

```bash
cp .env.example .env      # SQLite default; ANTHROPIC_API_KEY optional
npm install
npm run db:push           # create the schema
npm run dev               # http://localhost:3000
npm test                  # run the test suite
```

## Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Prisma datasource. Postgres URL for prod. |
| `AI_PROVIDER` | `anthropic` | Active provider: `anthropic` \| `stub`. |
| `ANTHROPIC_API_KEY` | _(empty)_ | Claude key. Empty ⇒ stub fallback. Server-side only. |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Model id. |
| `AI_TIMEOUT_MS` | `60000` | Timeout per provider attempt. |
| `AI_MAX_RPM` | `60` | In-process rate-limit guard (calls/min). |

## Architecture

```
UI (page.tsx, WordCard, WordDetails, ReviewSession, Pronounce, AuthForm)
        │  fetch
API routes (src/app/api)
  auth/*            register · login · logout · me   (scrypt + DB sessions)
  words             GET list · POST add
  words/[id]        DELETE
  words/[id]/enrich retry AI for a placeholder
  words/[id]/review SRS review (due words only)
  review            GET due queue
        │
Services
  enrichment.ts     getOrCreateLexeme — global dedupe + persistence
  ai/               provider-agnostic enrichment orchestrator
        │
Data (Prisma)
  User · Session · Lexeme (global enrichment) · Example · Word (per-user progress)
  ReviewLog (append-only review history)
```

**Global reuse.** Enrichment is expensive, so it is generated **once per word**
and shared. A `Lexeme` is keyed by the normalized input (`normalizeKey`:
lowercase, trimmed, whitespace-collapsed) with a unique index. `Word` holds only
per-user learning state (SRS status, difficulty, schedule) and references the
shared `Lexeme` — so two users adding "run" and "RUN " trigger **one** AI call.
The design targets millions of rows: adds are a single unique lookup.

## AI flow

1. `POST /api/words` → `getOrCreateLexeme(text)`.
2. Cache hit on the normalized `key` → return immediately, **no AI call**.
3. Cache miss → `enrich(text)`:
   - resolve the active provider from the **single registration point**
     (`ai/registry.ts`) — swapping to OpenAI/Gemini/local means adding one
     factory there and setting `AI_PROVIDER`; nothing else changes;
   - call the provider with an **AbortController timeout** and a rate-limit
     guard; the Anthropic provider also gets SDK-level backoff on 429/5xx;
   - parse the model's JSON and validate it with **Zod** (`ai/schema.ts`).
     LLM output is never trusted.
4. Persist the `Lexeme` + `Example`s; attach a `Word` to the user.
5. Structured JSON logs at every step (`ai/*` events via `lib/log.ts`).

The prompt (`ai/prompt.ts`) enforces: JSON only, original content, natural
(non-textbook) examples, no copyrighted material, concise definitions.

## Fallback strategy

Enrichment **never throws**. In order:

1. Provider attempt.
2. On timeout / network error / **invalid output**, retry **once**.
3. Still failing → deterministic **stub** (schema-valid placeholder). The word
   is still added and marked as a placeholder. It is upgraded in place by the
   card's **Enrich with AI** button, or the next time anyone adds that word.

No provider configured (`ANTHROPIC_API_KEY` empty) or rate limit hit ⇒ stub
directly, no wasted attempt.

## Testing

`npm test` (Vitest): validation schema, stub provider, JSON extraction,
provider registry, orchestrator retry/fallback, SRS scheduling, DTO mapping,
enrichment dedupe (cache hit skips the AI) and stub upgrades, rate limiting,
login (timing parity, per-account limit), and the words/review routes (401 gate,
owner scoping, due-only reviews, DTO shaping).

## Copyright policy

Enrichment content is **AI-generated and original**. The system never copies
definitions or example sentences from copyrighted dictionaries.

## Implemented so far

Auth (email/password, scrypt, DB sessions) · personal dictionary · SRS
(Day 1·3·7·14·30) · review sessions (active recall, keyboard: Space/1/2) ·
search, filter and delete · Web Speech pronunciation (US/UK, speed) · production
AI enrichment pipeline with global dedupe · rate limits on auth and AI adds
(in-process; needs a shared store when running more than one instance).

**Deferred:** email verification + password reset, AI agents (Teacher /
Pronunciation / Vocabulary / Writing), streaks and dashboard (`ReviewLog` already
records the history), pagination, import, mobile.
