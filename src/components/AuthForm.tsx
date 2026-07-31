"use client";

import { useState } from "react";

type User = { id: string; email: string; name: string | null };

export default function AuthForm({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      onAuth(data.user);
    } finally {
      setBusy(false);
    }
  }

  const card = { background: "var(--card)", borderColor: "var(--border)" } as const;

  return (
    <div
      className="mx-auto mt-20 max-w-sm rounded-2xl border p-6"
      style={card}
    >
      <h1 className="text-xl font-semibold tracking-tight">Homie English</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {mode === "login" ? "Log in to your dictionary" : "Create your account"}
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={card}
        />
        <input
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "register" ? "Password (8+ chars)" : "Password"}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={card}
        />
        {error && (
          <p className="text-sm" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {busy ? "…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode((m) => (m === "login" ? "register" : "login"));
          setError(null);
        }}
        className="mt-4 text-sm underline"
        style={{ color: "var(--muted)" }}
      >
        {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
      </button>
    </div>
  );
}
