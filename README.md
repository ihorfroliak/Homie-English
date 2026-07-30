# Homie English

AI-powered English vocabulary learning. Add a word or phrase → AI enriches it
(Ukrainian translation, IPA, pronunciation hint, CEFR level, original
explanation, natural examples) → it lands in your personal dictionary with a
spaced-repetition schedule.

Part of the **Homie** ecosystem (Coffee, HeyHomie, Homies, Homie English).

## Stack

- **Next.js 15** (App Router) — UI + API routes, one full-stack app
- **TypeScript** (strict) + **Tailwind CSS** (light/dark)
- **Prisma** ORM — **SQLite** for local dev, one-line swap to Postgres
- **Anthropic Claude** for enrichment, behind a provider seam with an
  offline stub so the app runs with **no API key**

## First vertical slice (implemented)

The core loop only, per the incremental rule:

- `POST /api/words` — add + AI-enrich + persist
- `GET /api/words` — the personal dictionary
- `POST /api/words/:id/review` — SRS review (Day 1·3·7·14·30 schedule)
- Home page: add-word box + dictionary cards with status + review buttons

Deferred (next slices): auth, agents (Teacher / Pronunciation / Vocabulary /
Writing coach), audio playback, dashboard, search, mobile.

## Run

```bash
cp .env.example .env      # SQLite default; ANTHROPIC_API_KEY optional
npm install
npm run db:push           # create the SQLite schema
npm run dev               # http://localhost:3000
```

Without `ANTHROPIC_API_KEY` the enrichment returns a deterministic stub so the
UI, DB, and SRS all work offline. Set the key for real Claude enrichment.

## Copyright policy

Enrichment content is **AI-generated and original**. The system never copies
definitions or example sentences from copyrighted dictionaries.
