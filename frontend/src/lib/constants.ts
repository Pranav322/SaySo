// In prod we set NEXT_PUBLIC_API_BASE="/api" (same-origin, routed to the backend).
// Locally it defaults to the dev backend.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

function deriveWsBase(): string {
  if (process.env.NEXT_PUBLIC_WS_BASE) return process.env.NEXT_PUBLIC_WS_BASE
  if (API_BASE.startsWith('http')) return API_BASE.replace(/^http/, 'ws')      // absolute → ws/wss
  if (typeof window !== 'undefined') {                                          // relative ("/api") → use current origin
    const scheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
    return scheme + window.location.host + API_BASE
  }
  return '' // SSR; WS is only opened client-side
}

export const WS_BASE = deriveWsBase()
export const MIC_SAMPLE_RATE      = 16_000
export const PLAYBACK_SAMPLE_RATE = 24_000
export const JITTER_BUFFER_SEC    = 0.08
// Qwen enrollment: 10–20s recommended, 60s / 10MB hard max. Cap at 30s.
export const MAX_CLIP_SEC         = 30
export const MAX_UPLOAD_BYTES     = 10 * 1024 * 1024
