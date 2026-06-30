'use client'
import { useRouter } from 'next/navigation'

const DESCRIPTIONS: Record<string, string> = {
  friend:   'Warm, casual, always in your corner',
  date:     'Curious, charming first-date energy',
  stranger: 'A friendly face for small-talk reps',
  mentor:   'Encouraging, calm, builds you up',
  coworker: 'Easygoing colleague, low-stakes chat',
}

// Accent tint per preset; custom personas fall back to amber.
const TINTS: Record<string, string> = {
  friend:   '#e8a13c',
  date:     '#d8729a',
  stranger: '#6fa8c7',
  mentor:   '#7fae8a',
  coworker: '#8a7bd8',
}

interface Props {
  id: string
  name: string
  custom?: boolean
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
}

export function PersonaCard({ id, name, custom, onDelete, onEdit }: Props) {
  const router = useRouter()
  const tint = custom ? '#e8a13c' : TINTS[id] ?? '#e8a13c'
  return (
    <div className="group relative">
      <button
        onClick={() => router.push(`/converse/${id}`)}
        className="relative flex min-h-24 w-full flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--line)]
                   bg-[var(--surface)] p-6 text-left transition-all hover:-translate-y-1 hover:border-[var(--line)]
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      >
        <span
          className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60"
          style={{ background: tint }}
        />
        <span
          className="h-7 w-7 rounded-full"
          style={{ background: `radial-gradient(circle at 30% 30%, ${tint}, #0a0908 75%)`, boxShadow: `0 0 22px -8px ${tint}` }}
        />
        <span className="font-display text-xl text-[var(--text)]">{name}</span>
        <span className="text-sm text-[var(--text-dim)]">
          {custom ? 'Your custom persona' : DESCRIPTIONS[id] ?? ''}
        </span>
      </button>

      {custom && (onDelete || onEdit) && (
        <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={() => onEdit(id)}
              aria-label={`Edit ${name}`}
              className="rounded-full bg-[#0a0908]/60 px-2 py-0.5 text-[var(--text-faint)]
                         transition hover:text-[var(--accent)]"
            >
              ✎
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              aria-label={`Delete ${name}`}
              className="rounded-full bg-[#0a0908]/60 px-2 py-0.5 text-[var(--text-faint)]
                         transition hover:text-[var(--ember)]"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}
