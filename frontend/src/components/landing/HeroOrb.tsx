"use client";

import { useEffect, useRef, useState } from "react";
import { VoicePoweredOrb, type OrbState } from "@/components/ui/voice-powered-orb";

// A self-animating version of the conversation orb for the marketing hero.
// It cycles through the same states a real session moves through and feeds a
// synthetic "voice level" so the shader breathes without a live mic.
const CYCLE: { state: OrbState; ms: number }[] = [
  { state: "listening", ms: 3200 },
  { state: "thinking", ms: 1400 },
  { state: "speaking", ms: 4200 },
  { state: "idle", ms: 1600 },
];

export function HeroOrb({ className }: { className?: string }) {
  const [idx, setIdx] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setIdx((i) => (i + 1) % CYCLE.length), CYCLE[idx].ms);
    return () => clearTimeout(t);
  }, [idx]);

  // Synthetic level: layered sines give an organic, speech-like envelope.
  const getLevel = () => {
    const t = (typeof performance !== "undefined" ? performance.now() : 0) / 1000;
    const s = CYCLE[idx].state;
    if (s === "idle" || s === "thinking") return 0;
    const env = 0.55 + 0.45 * Math.sin(t * 2.3);
    const detail = 0.5 + 0.5 * Math.sin(t * 9.1 + 1.7);
    return Math.max(0, Math.min(1, env * detail));
  };

  void startRef;
  return <VoicePoweredOrb className={className} state={CYCLE[idx].state} getLevel={getLevel} />;
}
