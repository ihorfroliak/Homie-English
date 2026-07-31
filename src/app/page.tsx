"use client";

import { useEffect, useState } from "react";
import AuthForm from "@/components/AuthForm";
import WordCard from "@/components/WordCard";
import type { WordDTO } from "@/lib/dto";

type User = { id: string; email: string; name: string | null };
type Pending = { tempId: string; text: string; error: string | null };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [words, setWords] = useState<WordDTO[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .finally(() => setReady(true));
  }, []);

  async function load() {
    const res = await fetch("/api/words");
    if (res.status === 401) return setUser(null);
    const data = await res.json();
    setWords(data.words ?? []);
  }

  useEffect(() => {
    if (user) load();
    else setWords([]);
  }, [user]);

  // Optimistic: show a pending card immediately, resolve on the API response.
  async function enrichAndAdd(tempId: string, wordText: string) {
    setPending((p) =>
      p.map((x) => (x.tempId === tempId ? { ...x, error: null } : x))
    );
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: wordText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPending((p) =>
          p.map((x) =>
            x.tempId === tempId
              ? { ...x, error: data.error ?? "Failed to add" }
              : x
          )
        );
        return;
      }
      setPending((p) => p.filter((x) => x.tempId !== tempId));
      setWords((w) => [data.word as WordDTO, ...w]);
    } catch {
      setPending((p) =>
        p.map((x) =>
          x.tempId === tempId ? { ...x, error: "Network error" } : x
        )
      );
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const tempId = `tmp_${Date.now()}`;
    setPending((p) => [{ tempId, text: t, error: null }, ...p]);
    setText("");
    enrichAndAdd(tempId, t);
  }

  async function review(id: string, grade: "again" | "good") {
    const res = await fetch(`/api/words/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade }),
    });
    if (res.ok) {
      const data = await res.json();
      setWords((w) => w.map((x) => (x.id === id ? (data.word as WordDTO) : x)));
    }
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

      <form onSubmit={submit} className="mb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. take responsibility"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
          style={card}
        />
        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          Add
        </button>
      </form>

      <div className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
        {words.length} word{words.length === 1 ? "" : "s"} in your dictionary
      </div>

      <ul className="space-y-3">
        {pending.map((p) => (
          <li key={p.tempId} className="rounded-xl border p-4" style={card}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-medium">{p.text}</span>
              {!p.error && (
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  Enriching with AI…
                </span>
              )}
            </div>
            {p.error ? (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm" style={{ color: "#dc2626" }}>
                  {p.error}
                </span>
                <button
                  onClick={() => enrichAndAdd(p.tempId, p.text)}
                  className="rounded-md border px-3 py-1 text-xs"
                  style={card}
                >
                  Retry
                </button>
                <button
                  onClick={() =>
                    setPending((list) => list.filter((x) => x.tempId !== p.tempId))
                  }
                  className="text-xs underline"
                  style={{ color: "var(--muted)" }}
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="mt-3 he-progress-track" />
            )}
          </li>
        ))}

        {words.map((w) => (
          <WordCard key={w.id} word={w} onReview={review} />
        ))}
      </ul>
    </main>
  );
}
