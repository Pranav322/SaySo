"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { HeroOrb } from "@/components/landing/HeroOrb";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VoiceprintMark } from "@/components/VoiceprintMark";

/* ------------------------------------------------------------------ */
/*  Scroll reveal — adds .is-in when an element scrolls into view.     */
/* ------------------------------------------------------------------ */
function useRevealRoot() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* small helper to stagger children */
const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` } as React.CSSProperties);

/* ------------------------------------------------------------------ */

const CONTEXTS = [
  "First date",
  "Asking someone out",
  "Small talk at a party",
  "Talking to your crush",
  "Meeting the parents",
  "Reconnecting after years",
  "Opening up to a friend",
  "Making a new friend",
  "Networking event",
  "Saying how you feel",
];

const FEATURES = [
  {
    k: "01",
    title: "Speech to speech",
    body: "One model hears you, thinks, and answers out loud — no transcribe-then-reply lag. It feels like a phone call, not a chatbot.",
    accent: "#e8a13c",
  },
  {
    k: "02",
    title: "Personas that feel real",
    body: "Not scripts. The date gets curious and asks a follow-up. The new face keeps the small talk going. They react like a real person would.",
    accent: "#8a7bd8",
  },
  {
    k: "03",
    title: "Clone any voice",
    body: "Drop in fifteen seconds of audio and rehearse with the actual person you're nervous to talk to — their cadence, their warmth, their pauses.",
    accent: "#6fa8c7",
  },
];

const STEPS = [
  { n: "Listening", hue: "#6fa8c7", body: "You talk. Sayso captures every word in real time, the way the other person would." },
  { n: "Thinking", hue: "#8a7bd8", body: "It reads intent, tone, and what you left unsaid — then decides how this person would react." },
  { n: "Speaking", hue: "#e8a13c", body: "It answers out loud, in character, fast enough to talk over. Just like a real conversation." },
];

const PERSONAS = [
  { name: "Friend", line: "Warm, in your corner. Just talk it out.", tint: "#e8a13c" },
  { name: "First Date", line: "Curious, a little playful. Easy to talk to.", tint: "#d8729a" },
  { name: "New Face", line: "Small talk, zero pressure. Keeps it going.", tint: "#6fa8c7" },
  { name: "Mentor", line: "Calm, encouraging. Builds you up.", tint: "#7fae8a" },
];

const STATS = [
  { v: "2.1M", l: "conversations rehearsed" },
  { v: "~320ms", l: "median voice latency" },
  { v: "41k", l: "custom voices cloned" },
  { v: "4.9/5", l: "would recommend" },
];

const QUOTES = [
  {
    q: "I practiced asking her out like six times the night before. The real one came out smooth — first time ever.",
    a: "Priya N.",
    r: "Grad student",
  },
  {
    q: "Small talk used to wreck me. I did a few reps with the 'new face' persona and actually enjoyed the party.",
    a: "Marcus L.",
    r: "Designer",
  },
  {
    q: "I rehearsed finally opening up to my best friend. Said the thing I'd been sitting on for a year.",
    a: "Dana K.",
    r: "Nurse",
  },
];

const FAQ = [
  {
    q: "Is this actually real-time, or transcribe-and-reply?",
    a: "Real-time. A single speech-to-speech model handles hearing, reasoning, and speaking in one stream, so replies land in roughly a third of a second — fast enough to be interrupted.",
  },
  {
    q: "Can it sound like a specific person?",
    a: "Yes. Enroll a short audio clip and Sayso clones the voice, then uses it for any persona you build. Great for rehearsing with a specific friend, date, or someone you're nervous to talk to.",
  },
  {
    q: "Do the personas actually feel real?",
    a: "Yes. Instructions steer behavior hard — the date asks a real follow-up, the new face keeps the small talk alive, the mentor listens and builds you up. They react like people, not scripts.",
  },
  {
    q: "Is my voice stored?",
    a: "Conversations are yours. Cloned voices live only in your session unless you save them, and you can delete any persona you create at any time.",
  },
];

export default function Landing() {
  const root = useRevealRoot();

  return (
    <main ref={root} className="grain relative min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* ====================== HERO ====================== */}
      <section className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-40 md:pt-48">
        {/* atmospheric glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-24 -z-0 h-[640px] w-[640px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(232,161,60,0.30) 0%, rgba(200,84,42,0.12) 40%, transparent 70%)" }}
        />

        <div className="relative grid w-full items-center gap-12 md:grid-cols-2 md:gap-8">
          {/* copy */}
          <div className="order-2 text-center md:order-1 md:text-left">
            <p data-reveal className="kicker mb-6">Real-time AI voice practice</p>
            <h1
              data-reveal
              style={delay(80)}
              className="font-display text-[clamp(2.8rem,6.5vw,5.2rem)] font-light leading-[0.98] tracking-[-0.02em] text-balance"
            >
              Rehearse the<br />
              conversation<br />
              that <span className="amber-grad italic">scares you.</span>
            </h1>
            <p data-reveal style={delay(180)} className="mx-auto mt-7 max-w-md text-[1.05rem] leading-relaxed text-[var(--text-dim)] text-pretty md:mx-0">
              Sayso puts you across from the date, the stranger, the friend you&apos;ve been meaning to call —
              a voice that talks back in real time. Practice out loud, before it counts.
            </p>
            <div data-reveal style={delay(280)} className="mt-9 flex flex-col items-center gap-3 sm:flex-row md:items-start">
              <Link
                href="/app"
                className="group inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-7 py-3.5 text-sm font-semibold text-[var(--bg)] shadow-[0_0_40px_-8px_rgba(232,161,60,0.6)] transition hover:bg-[var(--accent-soft)]"
              >
                Start practicing
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-7 py-3.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--text-faint)]"
              >
                See how it works
              </a>
            </div>
            <p data-reveal style={delay(360)} className="mt-7 font-mono text-xs tracking-wide text-[var(--text-faint)]">
              No script. No judgment. Just your voice and theirs.
            </p>
          </div>

          {/* orb — floats freely, no panel */}
          <div data-reveal style={delay(120)} className="order-1 flex justify-center md:order-2">
            <div className="relative aspect-square w-[78vw] max-w-[440px] animate-float-slow">
              <HeroOrb />
            </div>
          </div>
        </div>
      </section>

      {/* ====================== TRUST MARQUEE ====================== */}
      <section className="relative border-y border-[var(--line)] py-7">
        <p className="mb-5 text-center font-mono text-[0.7rem] tracking-[0.3em] text-[var(--text-faint)]">
          FOR THE CONVERSATIONS YOU REPLAY IN YOUR HEAD
        </p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-4">
            {[...CONTEXTS, ...CONTEXTS].map((c, i) => (
              <span
                key={i}
                className="whitespace-nowrap rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-2 text-sm text-[var(--text-dim)]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== FEATURES ====================== */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <div className="mb-16 max-w-2xl">
          <p data-reveal className="kicker mb-5">Why it feels real</p>
          <h2 data-reveal style={delay(80)} className="font-display text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.01em] text-balance">
            One model. Real time. <span className="italic text-[var(--text-dim)]">Out loud.</span>
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.k}
              data-reveal
              style={delay(i * 110)}
              className="group relative flex flex-col bg-[var(--bg)] p-8 transition-colors hover:bg-[var(--surface)]"
            >
              <span className="font-mono text-xs text-[var(--text-faint)]">{f.k}</span>
              <div className="mt-6 h-9 w-9 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, ${f.accent}, transparent 72%)`, boxShadow: `0 0 28px -6px ${f.accent}` }} />
              <h3 className="mt-6 font-display text-2xl font-normal">{f.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--text-dim)]">{f.body}</p>
              <div className="mt-6 h-px w-0 transition-all duration-500 group-hover:w-12" style={{ background: f.accent }} />
            </div>
          ))}
        </div>
      </section>

      {/* ====================== HOW IT WORKS ====================== */}
      <section id="how" className="relative mx-auto max-w-6xl px-6 py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p data-reveal className="kicker mb-5">The loop</p>
            <h2 data-reveal style={delay(80)} className="font-display text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.01em] text-balance">
              Three states.<br />A real conversation.
            </h2>
            <p data-reveal style={delay(160)} className="mt-6 max-w-md text-[var(--text-dim)] leading-relaxed">
              The orb isn&apos;t decoration. Its color tells you exactly where the other side
              is — listening to you, weighing it, or about to respond.
            </p>
            <ol className="mt-10 space-y-px overflow-hidden rounded-xl border border-[var(--line)]">
              {STEPS.map((s, i) => (
                <li
                  key={s.n}
                  data-reveal
                  style={delay(i * 100)}
                  className="flex items-start gap-5 bg-[var(--bg)] p-6"
                >
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: s.hue, boxShadow: `0 0 16px ${s.hue}` }} />
                  <div>
                    <h3 className="font-display text-xl">{s.n}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--text-dim)]">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* conversation mockup */}
          <div data-reveal style={delay(120)} className="relative">
            <div
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-40 blur-3xl"
              style={{ background: "radial-gradient(circle at 70% 30%, rgba(138,123,216,0.25), transparent 60%)" }}
            />
            <div className="rounded-[1.6rem] border border-[var(--line)] bg-gradient-to-b from-[var(--surface)] to-[var(--bg)] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#d8729a]" />
                  <div>
                    <p className="text-sm font-medium">First Date</p>
                    <p className="font-mono text-[0.65rem] tracking-wide text-[var(--text-faint)]">LIVE · 00:42</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#8a7bd8]/15 px-3 py-1 font-mono text-[0.6rem] tracking-wider text-[#8a7bd8]">THINKING</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--text)] px-4 py-2.5 text-[var(--bg)]">
                  I&apos;m really into hiking, and, uh… embarrassingly bad sci-fi movies.
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-[var(--line)] bg-[var(--bg)] px-4 py-2.5 text-[var(--text-dim)]">
                  Okay, bad sci-fi is a whole personality. What&apos;s the worst one you secretly love?
                </div>
              </div>

              {/* equalizer */}
              <div className="mt-5 flex items-end justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] py-5">
                {[0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.95, 0.45, 0.75, 0.55, 0.9, 0.35].map((h, i) => (
                  <span
                    key={i}
                    className="eq-bar w-1 rounded-full bg-gradient-to-t from-[var(--ember)] to-[var(--accent-soft)]"
                    style={{ height: `${h * 36 + 8}px`, animationDelay: `${i * 90}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================== PERSONAS ====================== */}
      <section id="personas" className="mx-auto max-w-6xl px-6 py-28">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p data-reveal className="kicker mb-5">Who you&apos;ll be talking to</p>
            <h2 data-reveal style={delay(80)} className="font-display text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.01em] text-balance">
              Pick who to talk to.<br />Or build your own.
            </h2>
          </div>
          <Link href="/create" data-reveal style={delay(140)} className="group inline-flex items-center gap-2 text-sm text-[var(--text-dim)] transition hover:text-[var(--text)]">
            Create a custom voice
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map((p, i) => (
            <Link
              href="/app"
              key={p.name}
              data-reveal
              style={delay(i * 90)}
              className="group relative flex h-56 flex-col justify-between overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition-all hover:-translate-y-1 hover:border-[var(--line)]"
            >
              <div
                className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
                style={{ background: p.tint }}
              />
              <span className="h-8 w-8 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, ${p.tint}, #0a0908 75%)`, boxShadow: `0 0 24px -8px ${p.tint}` }} />
              <div>
                <h3 className="font-display text-2xl">{p.name}</h3>
                <p className="mt-2 text-sm leading-snug text-[var(--text-dim)]">{p.line}</p>
              </div>
              <span className="font-mono text-xs text-[var(--text-faint)] transition-colors group-hover:text-[var(--text)]">Start talking →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ====================== STATS ====================== */}
      <section className="border-y border-[var(--line)] bg-[var(--bg)]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-[var(--line)] px-6 md:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.l} data-reveal style={delay(i * 90)} className="px-4 py-14 text-center md:py-16">
              <div className="font-display text-[clamp(2.4rem,5vw,3.6rem)] font-light tracking-tight amber-grad">{s.v}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================== TESTIMONIALS ====================== */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <p data-reveal className="kicker mb-5">From people who went first in here</p>
        <h2 data-reveal style={delay(80)} className="mb-14 max-w-2xl font-display text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.05] tracking-[-0.01em] text-balance">
          Practice once in private.<br />Walk in like you&apos;ve done it before.
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {QUOTES.map((t, i) => (
            <figure
              key={t.a}
              data-reveal
              style={delay(i * 110)}
              className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7"
            >
              <blockquote className="font-display text-xl font-light leading-snug text-[var(--text)]">
                &ldquo;{t.q}&rdquo;
              </blockquote>
              <figcaption className="mt-7 flex items-center gap-3 border-t border-[var(--line)] pt-5">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#6fa8c7] to-[#8a7bd8]" />
                <div>
                  <div className="text-sm font-medium">{t.a}</div>
                  <div className="text-xs text-[var(--text-faint)]">{t.r}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>


      {/* ====================== FAQ ====================== */}
      <section className="mx-auto max-w-3xl px-6 py-28">
        <p data-reveal className="kicker mb-5 text-center">Questions</p>
        <h2 data-reveal style={delay(80)} className="mb-12 text-center font-display text-[clamp(2rem,4vw,3rem)] font-light">
          The short answers.
        </h2>
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {FAQ.map((f, i) => (
            <details key={i} data-reveal style={delay(i * 60)} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
                {f.q}
                <span className="font-display text-2xl text-[var(--text-faint)] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-[var(--text-dim)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ====================== FINAL CTA ====================== */}
      <section className="relative overflow-hidden px-6 py-36 text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[130px]"
          style={{ background: "radial-gradient(circle, rgba(232,161,60,0.28), rgba(200,84,42,0.1) 45%, transparent 72%)" }}
        />
        <div className="relative mx-auto max-w-3xl">
          <h2 data-reveal className="font-display text-[clamp(2.8rem,7vw,5.5rem)] font-light leading-[0.98] tracking-[-0.02em] text-balance">
            They&apos;re ready <span className="amber-grad italic">when you are.</span>
          </h2>
          <p data-reveal style={delay(120)} className="mx-auto mt-6 max-w-md text-[var(--text-dim)]">
            Say the hard thing here first, where the only person watching is you.
          </p>
          <Link
            href="/app"
            data-reveal
            style={delay(220)}
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-9 py-4 text-base font-semibold text-[var(--bg)] shadow-[0_0_50px_-10px_rgba(232,161,60,0.7)] transition hover:bg-[var(--accent-soft)]"
          >
            Start practicing
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </section>

      {/* ====================== FOOTER ====================== */}
      <footer className="border-t border-[var(--line)] px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-sm text-[var(--text-faint)] md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            <span className="font-display text-lg text-[var(--text)]">Sayso</span>
          </div>
          <p className="font-mono text-xs tracking-wide">Practice the conversation. Then have it.</p>
          <div className="flex gap-6">
            <a href="#how" className="transition hover:text-[var(--text)]">How it works</a>
            <Link href="/app" className="transition hover:text-[var(--text)]">Open app</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
