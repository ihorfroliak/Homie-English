"use client";

import { useEffect, useMemo, useState } from "react";
import AuthForm from "@/components/AuthForm";
import ReviewSession from "@/components/ReviewSession";
import WordCard from "@/components/WordCard";
import type { WordDTO } from "@/lib/dto";

type User = { id: string; email: string; name: string | null };
type Pending = {
  tempId: string;
  text: string;
  error: string | null;
  retryable: boolean;
};

const STATUSES = ["All", "New", "Learning", "Reviewing", "Mastered"] as const;

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [words, setWords] = useState<WordDTO[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [text, setText] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .finally(() => setReady(true));
  }, []);

  async function load() {
    setLoadError(false);
    try {
      const res = await fetch("/api/words");
      if (res.status === 401) return setUser(null);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWords(data.words ?? []);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    if (user) load();
    else {
      setWords([]);
      setReviewing(false);
    }
  }, [user]);

  // Optimistic: show a pending card immediately, resolve on the API response.
  async function enrichAndAdd(tempId: string, wordText: string) {
    const fail = (error: string, retryable: boolean) =>
      setPending((p) =>
        p.map((x) => (x.tempId === tempId ? { ...x, error, retryable } : x))
      );

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
        fail(data.error ?? "Failed to add", !data.duplicate);
        return;
      }
      setPending((p) => p.filter((x) => x.tempId !== tempId));
      setWords((w) => [data.word as WordDTO, ...w]);
    } catch {
      fail("Network error", true);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const tempId = `tmp_${Date.now()}`;
    setPending((p) => [{ tempId, text: t, error: null, retryable: true }, ...p]);
    setText("");
    enrichAndAdd(tempId, t);
  }

  async function deleteWord(id: string) {
    const res = await fetch(`/api/words/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 404) {
      setWords((w) => w.filter((x) => x.id !== id));
    }
  }

  async function enrichWord(id: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/words/${id}/enrich`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Enrichment failed";
      setWords((w) => w.map((x) => (x.id === id ? (data.word as WordDTO) : x)));
      return null;
    } catch {
      return "Network error";
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  const dueCount = useMemo(() => {
    const now = Date.now();
    return words.filter((w) => new Date(w.dueAt).getTime() <= now).length;
  }, [words]);

  const masteredCount = useMemo(
    () => words.filter((w) => w.status === "Mastered").length,
    [words]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter(
      (w) =>
        (status === "All" || w.status === status) &&
        (!q ||
          w.text.toLowerCase().includes(q) ||
          w.translation?.toLowerCase().includes(q))
    );
  }, [words, query, status]);

  const card = { background: "var(--card)", borderColor: "var(--border)" } as const;
  const muted = { color: "var(--muted)" } as const;

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
          <p className="mt-1 text-sm" style={muted}>
            Add a word or phrase — AI enriches it, you remember it.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs" style={muted}>
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

      {reviewing ? (
        <ReviewSession
          onExit={() => {
            setReviewing(false);
            load();
          }}
        />
      ) : (
        <>
          <section
            className="mb-6 flex items-center justify-between gap-4 rounded-xl border p-4"
            style={card}
          >
            <div>
              <div className="text-sm font-medium">
                {dueCount
                  ? `${dueCount} word${dueCount === 1 ? "" : "s"} to review`
                  : "All caught up"}
              </div>
              <div className="mt-0.5 text-xs" style={muted}>
                {words.length} in dictionary · {masteredCount} mastered
              </div>
            </div>
            <button
              onClick={() => setReviewing(true)}
              disabled={!dueCount}
              className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              Start review
            </button>
          </section>

          <form onSubmit={submit} className="mb-4 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. take responsibility"
              aria-label="Add a word or phrase"
              maxLength={200}
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
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

          {words.length > 0 && (
            <div className="mb-4 flex gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your words"
                aria-label="Search your words"
                className="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
                style={card}
              />
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as (typeof STATUSES)[number])
                }
                aria-label="Filter by status"
                className="rounded-lg border px-2 py-1.5 text-sm"
                style={card}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {loadError && (
            <div className="mb-4 flex items-center gap-3 text-sm">
              <span style={{ color: "#dc2626" }}>Could not load your words.</span>
              <button
                onClick={load}
                className="rounded-md border px-3 py-1 text-xs"
                style={card}
              >
                Retry
              </button>
            </div>
          )}

          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.tempId} className="rounded-xl border p-4" style={card}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-medium">{p.text}</span>
                  {!p.error && (
                    <span className="text-xs" style={muted}>
                      Enriching with AI…
                    </span>
                  )}
                </div>
                {p.error ? (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-sm" style={{ color: "#dc2626" }}>
                      {p.error}
                    </span>
                    {p.retryable && (
                      <button
                        onClick={() => enrichAndAdd(p.tempId, p.text)}
                        className="rounded-md border px-3 py-1 text-xs"
                        style={card}
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setPending((list) =>
                          list.filter((x) => x.tempId !== p.tempId)
                        )
                      }
                      className="text-xs underline"
                      style={muted}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 he-progress-track" />
                )}
              </li>
            ))}

            {visible.map((w) => (
              <WordCard
                key={w.id}
                word={w}
                onDelete={deleteWord}
                onEnrich={enrichWord}
              />
            ))}
          </ul>

          {!loadError && words.length === 0 && pending.length === 0 && (
            <p className="py-10 text-center text-sm" style={muted}>
              Your dictionary is empty. Add the first word you want to remember.
            </p>
          )}
          {words.length > 0 && visible.length === 0 && (
            <p className="py-10 text-center text-sm" style={muted}>
              No words match your search.
            </p>
          )}
        </>
      )}
    </main>
  );
}
