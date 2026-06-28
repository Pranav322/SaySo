'use client'
import { useEffect, useRef } from 'react'

// Radial "voiceprint" brand mark — bars radiating from the center, coral→amber→violet,
// gently animated. Pass getLevel (0–1) to make it react to live audio.
const STOPS: [number, number, number][] = [[255, 92, 57], [244, 169, 60], [138, 123, 216]]

function colorAt(t: number) {
  const seg = t * 2
  const i = Math.min(1, Math.floor(seg))
  const f = seg - i
  const a = STOPS[i], b = STOPS[i + 1]
  const l = (x: number, y: number) => Math.round(x + (y - x) * f)
  return `rgb(${l(a[0], b[0])},${l(a[1], b[1])},${l(a[2], b[2])})`
}

export function VoiceprintMark({
  size = 24,
  getLevel,
  className = '',
}: {
  size?: number
  getLevel?: () => number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const levelRef = useRef(getLevel)
  levelRef.current = getLevel

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2, cy = size / 2, N = 56, inner = size * 0.16
    const seed = Array.from({ length: N }, (_, i) =>
      0.4 + 0.6 * Math.abs(Math.sin(i * 0.7)) + 0.12 * Math.abs(Math.cos(i * 1.9)))

    let raf = 0, t = 0
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const draw = () => {
      const lvl = levelRef.current?.() ?? 0
      ctx.clearRect(0, 0, size, size)
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(1.5, size * 0.02)
      for (let i = 0; i < N; i++) {
        const ang = (i / N) * Math.PI * 2 - Math.PI / 2
        const wobble = 0.45 + 0.55 * Math.abs(Math.sin(i * 0.7 + t))
        const amp = inner * 1.25 * wobble * seed[i] * (1 + lvl * 0.9)
        const x1 = cx + Math.cos(ang) * inner, y1 = cy + Math.sin(ang) * inner
        const x2 = cx + Math.cos(ang) * (inner + amp), y2 = cy + Math.sin(ang) * (inner + amp)
        const col = colorAt(i / N)
        ctx.strokeStyle = col
        ctx.shadowColor = col
        ctx.shadowBlur = size * 0.08
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      }
      t += getLevel ? 0.06 : 0.02
      if (!reduce || getLevel) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [size, getLevel])

  return <canvas ref={ref} style={{ width: size, height: size }} className={className} aria-hidden="true" />
}
