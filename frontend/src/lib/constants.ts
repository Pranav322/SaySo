export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'
// Derive the WS base from the API base (http→ws, https→wss) unless explicitly set,
// so prod only needs NEXT_PUBLIC_API_BASE.
export const WS_BASE  = process.env.NEXT_PUBLIC_WS_BASE  ?? API_BASE.replace(/^http/, 'ws')
export const MIC_SAMPLE_RATE      = 16_000
export const PLAYBACK_SAMPLE_RATE = 24_000
export const JITTER_BUFFER_SEC    = 0.08
// Qwen enrollment: 10–20s recommended, 60s / 10MB hard max. Cap at 30s.
export const MAX_CLIP_SEC         = 30
export const MAX_UPLOAD_BYTES     = 10 * 1024 * 1024
