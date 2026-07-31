"use client";

import Pronounce from "@/components/Pronounce";
import type { WordDTO } from "@/lib/dto";

const statusColor: Record<string, string> = {
  New: "#78716c",
  Learning: "#d97706",
  Reviewing: "#2563eb",
  Mastered: "#16a34a",
};

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 text-sm">
      <span style={{ color: "var(--muted)" }}>{label}: </span>
      {items.join(", ")}
    </div>
  );
}

export default function WordCard({
  word: w,
  onReview,
}: {
  word: WordDTO;
  onReview: (id: string, grade: "again" | "good") => void;
}) {
  const card = { background: "var(--card)", borderColor: "var(--border)" } as const;
  const meta = [w.partOfSpeech, w.cefr, w.lemma !== w.text ? w.lemma : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="rounded-xl border p-4" style={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-medium">{w.text}</span>
            {w.ipaUk && (
              <span className="text-sm" style={{ color: "var(--muted)" }}>
                UK {w.ipaUk}
              </span>
            )}
            {w.ipaUs && (
              <span className="text-sm" style={{ color: "var(--muted)" }}>
                US {w.ipaUs}
              </span>
            )}
          </div>
          {w.translation && (
            <div className="text-sm" style={{ color: "var(--muted)" }}>
              {w.translation}
              {w.altTranslations.length > 0 &&
                ` · ${w.altTranslations.join(", ")}`}
            </div>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ background: statusColor[w.status] ?? "#78716c" }}
        >
          {w.status}
        </span>
      </div>

      <div className="mt-2">
        <Pronounce text={w.text} />
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

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onReview(w.id, "again")}
          className="rounded-md border px-3 py-1 text-xs"
          style={card}
        >
          Again
        </button>
        <button
          onClick={() => onReview(w.id, "good")}
          className="rounded-md border px-3 py-1 text-xs"
          style={card}
        >
          Good
        </button>
      </div>
    </li>
  );
}
