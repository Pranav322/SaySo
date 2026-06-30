'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { VoiceprintMark } from '@/components/VoiceprintMark'

export function SharedNav() {
  const pathname = usePathname()
  const isLanding = pathname === '/'

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--line)] bg-[var(--bg-blur)] backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <VoiceprintMark size={26} />
          <span className="font-display text-xl tracking-tight">Sayso</span>
        </Link>
        {/* Only show anchor links on landing page where they actually work */}
        {isLanding && (
          <div className="hidden items-center gap-9 text-sm text-[var(--text-dim)] md:flex">
            <a href="#how" className="transition hover:text-[var(--text)]">How it works</a>
            <a href="#personas" className="transition hover:text-[var(--text)]">Personas</a>
          </div>
        )}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/app"
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--on-accent)] transition hover:bg-[var(--accent-deep)]"
          >
            Open app
          </Link>
        </div>
      </nav>
    </header>
  )
}
