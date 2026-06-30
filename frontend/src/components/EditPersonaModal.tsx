'use client'
import { useState, useEffect } from 'react'
import { API_BASE } from '@/lib/constants'
import { getSessionId } from '@/lib/session'

interface EditPersonaModalProps {
  personaId: string | null
  onClose: () => void
  onSave: (persona: { id: string; name: string; instructions: string }) => void
}

export function EditPersonaModal({ personaId, onClose, onSave }: EditPersonaModalProps) {
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!personaId) return
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/personas/${personaId}`, {
      headers: { 'X-Session-Id': getSessionId() },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load persona')
        return r.json()
      })
      .then((data) => {
        setName(data.name)
        setInstructions(data.instructions)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Error loading persona')
        setLoading(false)
      })
  }, [personaId])

  const handleSave = async () => {
    if (!personaId || !name.trim() || !instructions.trim()) return
    setSaving(true)
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/personas/${personaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': getSessionId(),
        },
        body: JSON.stringify({ name: name.trim(), instructions: instructions.trim() }),
      })
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body.detail || `Update failed (${resp.status})`)
      }
      const updated = await resp.json()
      onSave(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (!personaId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-2xl">
        <h2 className="font-display text-2xl">Edit persona</h2>

        {loading && <p className="mt-4 text-[var(--text-dim)]">Loading…</p>}

        {!loading && (
          <div className="mt-6 space-y-6">
            {/* Name */}
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My manager"
                className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-[var(--text)]
                           placeholder:text-[var(--text-faint)] transition focus:border-[#FF5C39]/50 focus:outline-none"
              />
            </label>

            {/* Instructions */}
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">How should they behave?</span>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="You are my skeptical manager..."
                className="resize-none rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-[var(--text)]
                           placeholder:text-[var(--text-faint)] transition focus:border-[#FF5C39]/50 focus:outline-none"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-[#c8542a]/30 bg-[#c8542a]/10 px-4 py-3 text-sm text-[var(--accent-soft)]">
                {error}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-full border border-[var(--line)] py-3 text-sm font-medium transition
                           hover:border-[var(--text-faint)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || !instructions.trim()}
                className="flex-1 rounded-full bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--bg)]
                           transition hover:bg-[var(--accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
