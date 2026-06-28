import Link from 'next/link'
import { AppNav } from '@/components/AppNav'

export default function NotFound() {
  return (
    <main className="grain relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <AppNav />

      {/* ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[520px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[130px]"
        style={{ background: 'radial-gradient(circle, rgba(255,92,57,0.22), transparent 70%)' }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <p className="kicker mb-5">Error 404 · Lost the thread</p>

        {/* the conversation trailed off — an ellipsis as the hero mark */}
        <div className="amber-grad font-display text-[clamp(4rem,16vw,9rem)] font-light leading-none tracking-[-0.03em]">
          …
        </div>

        <h1 className="mt-2 max-w-xl font-display text-[clamp(1.8rem,4.5vw,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-balance">
          This conversation <span className="italic text-[var(--text-dim)]">trailed off.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-md text-[1.02rem] leading-relaxed text-[var(--text-dim)] text-pretty">
          The page you&apos;re after isn&apos;t here. Let&apos;s get you back to someone worth talking to.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/app"
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-7 py-3.5 text-sm font-semibold text-[var(--on-accent)] shadow-[0_10px_30px_-10px_rgba(255,92,57,0.7)] transition hover:bg-[var(--accent-deep)]"
          >
            Pick someone to talk to
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-7 py-3.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--text-faint)]"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  )
}
