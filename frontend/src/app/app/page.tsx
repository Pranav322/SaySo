'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PersonaCard } from '@/components/PersonaCard'
import { AppNav } from '@/components/AppNav'
import { API_BASE } from '@/lib/constants'
import { getSessionId } from '@/lib/session'

type Persona = { id: string; name: string; custom?: boolean }

export default function AppHome() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/personas`, { headers: { 'X-Session-Id': getSessionId() } })
      .then((r) => r.json())
      .then((data) => { setPersonas(data); setLoading(false) })
      .catch(() => { setError('Could not reach backend. Is it running on port 8000?'); setLoading(false) })
  }, [])

  const handleDelete = async (id: string) => {
    const resp = await fetch(`${API_BASE}/personas/${id}`, {
      method: 'DELETE',
      headers: { 'X-Session-Id': getSessionId() },
    })
    if (resp.ok) setPersonas((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <main className="grain relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <AppNav />
      {/* atmospheric glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[480px] w-[680px] -translate-x-1/2 opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(255,92,57,0.16) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-14">
        <p className="kicker mb-4">Who you&apos;ll be talking to</p>
        <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] font-light leading-[1.02] tracking-[-0.01em] text-balance">
          Pick someone to<br />practice talking to.
        </h1>
        <p className="mb-12 mt-4 text-[var(--text-dim)]">Choose a persona, or clone a voice of your own.</p>

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-[#c8542a]/30 bg-[#c8542a]/10 px-4 py-3 text-sm text-[var(--accent-soft)]">{error}</p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {personas.map((p) => (
              <PersonaCard key={p.id} id={p.id} name={p.name} custom={p.custom} onDelete={handleDelete} />
            ))}
            <Link
              href="/create"
              className="group flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border
                         border-dashed border-[var(--line)] p-6 text-[var(--text-faint)] transition
                         hover:border-[#FF5C39]/50 hover:text-[var(--accent)]"
            >
              <span className="font-display text-3xl transition-transform group-hover:scale-110">+</span>
              <span className="text-sm">Create persona</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
