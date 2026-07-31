"use client";

import { useEffect, useRef, useState } from "react";

type Accent = "en-US" | "en-GB";

// Pick the best available voice for an accent; fall back to any en-* voice.
function pickVoice(voices: SpeechSynthesisVoice[], accent: Accent) {
  return (
    voices.find((v) => v.lang === accent) ??
    voices.find((v) => v.lang.startsWith(accent.slice(0, 2))) ??
    null
  );
}

export default function Pronounce({ text }: { text: string }) {
  const [supported, setSupported] = useState(true);
  const [accent, setAccent] = useState<Accent>("en-US");
  const [rate, setRate] = useState(1);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const load = () => (voicesRef.current = window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  function speak() {
    if (!supported) return;
    window.speechSynthesis.cancel(); // replay = restart cleanly
    const u = new SpeechSynthesisUtterance(text);
    u.lang = accent;
    u.rate = rate;
    const v = pickVoice(voicesRef.current, accent);
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

  if (!supported) return null;

  const chip = {
    background: "var(--card)",
    borderColor: "var(--border)",
  } as const;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={speak}
        aria-label={`Play pronunciation (${accent})`}
        title="Play / replay"
        className="rounded-md border px-2 py-1 text-xs"
        style={chip}
      >
        🔊
      </button>
      <button
        onClick={() => setAccent((a) => (a === "en-US" ? "en-GB" : "en-US"))}
        title="Toggle American / British"
        className="rounded-md border px-2 py-1 text-xs"
        style={chip}
      >
        {accent === "en-US" ? "US" : "UK"}
      </button>
      <button
        onClick={() => setRate((r) => (r <= 0.5 ? 1 : r <= 0.75 ? 0.5 : 0.75))}
        title="Playback speed"
        className="rounded-md border px-2 py-1 text-xs tabular-nums"
        style={chip}
      >
        {rate}×
      </button>
    </div>
  );
}
