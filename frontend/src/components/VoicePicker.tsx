'use client'
import { useRef, useState } from 'react'

type Voice = { id: string; gender: string }

export function VoicePicker({
  voices,
  value,
  onChange,
}: {
  voices: Voice[]
  value: string
  onChange: (id: string) => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)

  const preview = (id: string) => {
    audioRef.current?.pause()
    const a = new Audio(`/voices/${id}.wav`)
    audioRef.current = a
    setPlaying(id)
    a.onended = () => setPlaying((p) => (p === id ? null : p))
    a.play().catch(() => setPlaying(null))
  }

  const select = (id: string) => {
    onChange(id)
    if (id) preview(id) // hear what you picked
  }

  const chip = (id: string, label: string) => {
    const selected = value === id
    return (
      <button
        key={id || 'default'}
        type="button"
        onClick={() => select(id)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
          selected
            ? 'border-[var(--accent)] bg-[#FF5C39]/15 text-[var(--text)]'
            : 'border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line)] hover:text-[var(--text)]'
        }`}
      >
        {id && (
          <span className={`text-xs ${playing === id ? 'text-[var(--accent)]' : 'opacity-60'}`}>
            {playing === id ? '◼' : '▶'}
          </span>
        )}
        {label}
      </button>
    )
  }

  const male = voices.filter((v) => v.gender === 'male')
  const female = voices.filter((v) => v.gender === 'female')

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <span className="text-xs uppercase tracking-widest text-[var(--text-faint)]">Voice — tap to hear</span>
      {chip('', 'Default')}
      <div className="flex flex-wrap justify-center gap-2">
        {male.map((v) => chip(v.id, v.id))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {female.map((v) => chip(v.id, v.id))}
      </div>
    </div>
  )
}
