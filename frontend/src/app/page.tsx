'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PersonaCard } from '@/components/PersonaCard'
import { API_BASE } from '@/lib/constants'
import { getSessionId } from '@/lib/session'

type Persona = { id: string; name: string; custom?: boolean }

export default function Home() {
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
    <main className="min-h-screen bg-black px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold text-white">Mirror</h1>
        <p className="mb-10 text-white/40">Pick someone to practice talking to.</p>

        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {personas.map((p) => (
              <PersonaCard key={p.id} id={p.id} name={p.name} custom={p.custom} onDelete={handleDelete} />
            ))}
            <Link
              href="/create"
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border
                         border-dashed border-white/20 p-6 text-white/50 transition
                         hover:border-white/40 hover:text-white"
            >
              <span className="text-2xl">+</span>
              <span className="text-sm">Create persona</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
