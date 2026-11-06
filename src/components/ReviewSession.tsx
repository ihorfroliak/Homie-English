"use client";

import { useCallback, useEffect, useState } from "react";
import Pronounce from "@/components/Pronounce";
import WordDetails from "@/components/WordDetails";
import type { WordDTO } from "@/lib/dto";

type Grade = "again" | "good";

// Active recall: see the word, try to remember it, reveal, grade yourself.
export default function ReviewSession({ onExit }: { onExit: () => void }) {
  const [queue, setQueue] = useState<WordDTO[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState({ good: 0, again: 0 });

  const loadQueue = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/review");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQueue(data.words ?? []);
      setIndex(0);
      setRevealed(false);
    } catch {
      setError("Could not load your reviews.");
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const current = queue?.[index];

  const grade = useCallback(
    async (g: Grade) => {
      if (!current || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/words/${current.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade: g }),
        });
        // 404/409: deleted or already reviewed elsewhere. Move on, don't count.
        if (!res.ok && res.status !== 404 && res.status !== 409) throw new Error();
        if (res.ok) setScore((s) => ({ ...s, [g]: s[g] + 1 }));
        setIndex((i) => i + 1);
        setRevealed(false);
      } catch {
        setError("Could not save. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [current, busy]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current || e.repeat) return;
      // Keep Space/Enter working on whichever button has focus.
      if (e.target instanceof HTMLButtonElement) return;
      if (!revealed && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && e.key === "1") {
        grade("again");
      } else if (revealed && e.key === "2") {
        grade("good");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, revealed, grade]);

  const card = { background: "var(--card)", borderColor: "var(--border)" } as const;
  const muted = { color: "var(--muted)" } as const;

  const exit = (
    <button onClick={onExit} className="text-sm underline" style={muted}>
      Back to dictionary
    </button>
  );

  if (!queue) {
    return (
      <div className="py-12 text-center text-sm" style={muted}>
        {error ? (
          <div className="space-y-3">
            <p style={{ color: "#dc2626" }}>{error}</p>
            <button
              onClick={loadQueue}
              className="rounded-md border px-3 py-1 text-xs"
              style={card}
            >
              Retry
            </button>
            <div>{exit}</div>
          </div>
        ) : (
          "Loading…"
        )}
      </div>
    );
  }

  if (!current) {
    const reviewed = score.good + score.again;
    return (
      <div className="rounded-xl border p-8 text-center" style={card}>
        <h2 className="text-lg font-semibold">
          {reviewed ? "Session complete" : "Nothing to review"}
        </h2>
        <p className="mt-1 text-sm" style={muted}>
          {reviewed
            ? `${score.good} remembered · ${score.again} to repeat tomorrow`
            : "All caught up. New reviews will appear when they are due."}
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          {reviewed > 0 && (
            <button
              onClick={loadQueue}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              Check for more
            </button>
          )}
          {exit}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs" style={muted}>
        <span>
          {index + 1} / {queue.length}
        </span>
        {exit}
      </div>

      <div className="rounded-xl border p-6" style={card}>
        <div className="text-center">
          <div className="text-3xl font-semibold tracking-tight">{current.text}</div>
          <div className="mt-3 flex justify-center">
            <Pronounce text={current.text} />
          </div>
        </div>

        {revealed ? (
          <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <div className="mb-2 text-lg font-medium">
              {current.placeholder
                ? "No AI translation yet"
                : [current.translation, ...current.altTranslations]
                    .filter(Boolean)
                    .join(", ")}
            </div>
            {!current.placeholder && <WordDetails word={current} />}
          </div>
        ) : (
          <p className="mt-6 text-center text-sm" style={muted}>
            Do you remember what it means?
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {revealed ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => grade("again")}
            disabled={busy}
            className="rounded-lg border px-4 py-3 text-sm font-medium disabled:opacity-50"
            style={card}
          >
            Forgot <span style={muted}>· 1</span>
          </button>
          <button
            onClick={() => grade("good")}
            disabled={busy}
            className="rounded-lg px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            Remembered · 2
          </button>
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="mt-4 w-full rounded-lg px-4 py-3 text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          Show answer · Space
        </button>
      )}
    </div>
  );
}
