'use client'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { VoiceprintMark } from '@/components/VoiceprintMark'

/* Shared top bar for the product pages (/app, /create, /converse) so they all
   read as one site. Brand returns to the picker; theme toggle on the right. */
export function AppNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--bg-blur)] backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <VoiceprintMark size={26} />
          <span className="font-display text-xl tracking-tight">Sayso</span>
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  )
}
