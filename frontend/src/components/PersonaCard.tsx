'use client'
import { useRouter } from 'next/navigation'

const DESCRIPTIONS: Record<string, string> = {
  ceo:            'Decisive, direct, results-driven',
  cto:            'Technical, probing, no-nonsense',
  interviewer:    'Professional, evaluative, curious',
  strict_manager: 'Blunt, demanding, zero excuses',
  investor:       'Skeptical, sharp, high standards',
}

interface Props {
  id: string
  name: string
  custom?: boolean
  onDelete?: (id: string) => void
}

export function PersonaCard({ id, name, custom, onDelete }: Props) {
  const router = useRouter()
  return (
    <div className="group relative">
      <button
        onClick={() => router.push(`/converse/${id}`)}
        className="flex w-full flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-6 text-left
                   transition hover:border-white/30 hover:bg-white/10 focus-visible:outline
                   focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="text-lg font-semibold text-white">{name}</span>
        <span className="text-sm text-white/50">
          {custom ? 'Your custom persona' : DESCRIPTIONS[id] ?? ''}
        </span>
      </button>

      {custom && onDelete && (
        <button
          onClick={() => onDelete(id)}
          aria-label={`Delete ${name}`}
          className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-white/40
                     opacity-0 transition hover:text-red-400 group-hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  )
}
