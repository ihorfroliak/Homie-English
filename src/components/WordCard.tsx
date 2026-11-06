"use client";

import { useState } from "react";
import Pronounce from "@/components/Pronounce";
import WordDetails from "@/components/WordDetails";
import type { WordDTO } from "@/lib/dto";

const statusColor: Record<string, string> = {
  New: "#78716c",
  Learning: "#d97706",
  Reviewing: "#2563eb",
  Mastered: "#16a34a",
};

function dueLabel(dueAt: WordDTO["dueAt"]): string {
  const days = Math.ceil((new Date(dueAt).getTime() - Date.now()) / 864e5);
  if (days <= 0) return "Due now";
  return days === 1 ? "Due tomorrow" : `Due in ${days} days`;
}

export default function WordCard({
  word: w,
  onDelete,
  onEnrich,
}: {
  word: WordDTO;
  onDelete: (id: string) => Promise<void>;
  onEnrich: (id: string) => Promise<string | null>; // error message or null
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  const card = { background: "var(--card)", borderColor: "var(--border)" } as const;
  const muted = { color: "var(--muted)" } as const;

  async function enrich() {
    setEnriching(true);
    setEnrichError(null);
    setEnrichError(await onEnrich(w.id));
    setEnriching(false);
  }

  return (
    <li className="rounded-xl border" style={card}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-lg font-medium">{w.text}</span>
          <span className="block truncate text-sm" style={muted}>
            {w.placeholder
              ? "No AI translation yet"
              : [w.translation, ...w.altTranslations].filter(Boolean).join(", ")}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ background: statusColor[w.status] ?? "#78716c" }}
          >
            {w.status}
          </span>
          <span className="text-xs" style={muted}>
            {dueLabel(w.dueAt)}
          </span>
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {w.placeholder ? (
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <span style={muted}>
                {enrichError ?? "AI was unavailable when this word was added."}
              </span>
              <button
                onClick={enrich}
                disabled={enriching}
                className="rounded-md border px-3 py-1 text-xs disabled:opacity-50"
                style={card}
              >
                {enriching ? "Enriching…" : "Enrich with AI"}
              </button>
            </div>
          ) : (
            <WordDetails word={w} />
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <Pronounce text={w.text} />
            {confirming ? (
              <span className="flex items-center gap-2 text-xs">
                <span style={muted}>Delete progress too?</span>
                <button
                  onClick={() => onDelete(w.id)}
                  className="rounded-md px-3 py-1 font-medium text-white"
                  style={{ background: "#dc2626" }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="rounded-md border px-3 py-1"
                  style={card}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-xs underline"
                style={muted}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
