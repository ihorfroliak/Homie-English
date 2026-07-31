"use client";

import { useEffect, useState } from "react";
import AuthForm from "@/components/AuthForm";
import Pronounce from "@/components/Pronounce";

type Example = { id: string; en: string; translation: string | null };
type Word = {
  id: string;
  text: string;
  translation: string | null;
  ipa: string | null;
  uaHint: string | null;
  partOfSpeech: string | null;
  cefr: string | null;
  explanation: string | null;
  synonyms: string | null;
  antonyms: string | null;
  collocations: string | null;
  notes: string | null;
  status: string;
  difficulty: string;
  examples: Example[];
};
type User = { id: string; email: string; name: string | null };

const statusColor: Record<string, string> = {
  New: "#78716c",
  Learning: "#d97706",
  Reviewing: "#2563eb",
  Mastered: "#16a34a",
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .finally(() => setReady(true));
  }, []);

  async function load() {
    const res = await fetch("/api/words");
    if (res.status === 401) {
      setUser(null);
      return;
    }
    const data = await res.json();
    setWords(data.words ?? []);
  }

  useEffect(() => {
    if (user) load();
    else setWords([]);
  }, [user]);

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to add word");
        return;
      }
      setText("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function review(id: string, grade: "again" | "good") {
    await fetch(`/api/words/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade }),
    });
    await load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  const card = { background: "var(--card)", borderColor: "var(--border)" } as const;

  if (!ready) return null;
  if (!user)
    return (
      <main className="px-5">
        <AuthForm onAuth={setUser} />
      </main>
    );

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <header className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Homie English</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Add a word or phrase — AI enriches it, you remember it.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {user.email}
          </div>
          <button
            onClick={logout}
            className="mt-1 rounded-md border px-2 py-1 text-xs"
            style={card}
          >
            Log out
          </button>
        </div>
      </header>

      <form onSubmit={addWord} className="mb-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. take responsibility"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
          style={card}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "Adding…" : "Add"}
        </button>
      </form>
      {error && (
        <p className="mb-4 text-sm" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      <div className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
        {words.length} word{words.length === 1 ? "" : "s"} in your dictionary
      </div>

      <ul className="space-y-3">
        {words.map((w) => (
          <li key={w.id} className="rounded-xl border p-4" style={card}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">{w.text}</span>
                  {w.ipa && (
                    <span className="text-sm" style={{ color: "var(--muted)" }}>
                      {w.ipa}
                    </span>
                  )}
                </div>
                {w.translation && (
                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                    {w.translation}
                    {w.uaHint ? ` · ${w.uaHint}` : ""}
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

            {(w.partOfSpeech || w.cefr) && (
              <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                {[w.partOfSpeech, w.cefr].filter(Boolean).join(" · ")}
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

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => review(w.id, "again")}
                className="rounded-md border px-3 py-1 text-xs"
                style={card}
              >
                Again
              </button>
              <button
                onClick={() => review(w.id, "good")}
                className="rounded-md border px-3 py-1 text-xs"
                style={card}
              >
                Good
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
