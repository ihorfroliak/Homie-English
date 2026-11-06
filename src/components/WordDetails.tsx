"use client";

import type { WordDTO } from "@/lib/dto";

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 text-sm">
      <span style={{ color: "var(--muted)" }}>{label}: </span>
      {items.join(", ")}
    </div>
  );
}

// The full enrichment of a word. Shared by the dictionary card and the review
// answer side.
export default function WordDetails({ word: w }: { word: WordDTO }) {
  const card = { background: "var(--card)", borderColor: "var(--border)" } as const;
  const meta = [w.partOfSpeech, w.cefr, w.lemma !== w.text ? w.lemma : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="flex flex-wrap gap-x-3 text-sm" style={{ color: "var(--muted)" }}>
        {w.ipaUk && <span>UK {w.ipaUk}</span>}
        {w.ipaUs && <span>US {w.ipaUs}</span>}
      </div>

      {meta && (
        <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          {meta}
        </div>
      )}
      {w.explanation && <p className="mt-2 text-sm">{w.explanation}</p>}

      {w.examples.length > 0 && (
        <ul className="mt-2 space-y-1">
          {w.examples.map((ex) => (
            <li key={ex.id} className="text-sm">
              <span>“{ex.en}”</span>
              {ex.translation && (
                <span style={{ color: "var(--muted)" }}> — {ex.translation}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <Chips label="Collocations" items={w.collocations} />
      <Chips label="Synonyms" items={w.synonyms} />
      <Chips label="Antonyms" items={w.antonyms} />
      <Chips label="Common mistakes" items={w.commonMistakes} />

      {(w.plural || w.irregularForms) && (
        <div className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {[w.plural && `Plural: ${w.plural}`, w.irregularForms]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}

      {w.pronunciationTips && (
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          🗣 {w.pronunciationTips}
        </p>
      )}
      {w.mnemonic && (
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          💡 {w.mnemonic}
        </p>
      )}

      {w.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {w.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border px-2 py-0.5 text-xs"
              style={card}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
