'use client'
import { useRef, useCallback } from 'react'
import { PLAYBACK_SAMPLE_RATE, JITTER_BUFFER_SEC } from '@/lib/constants'
import { int16ToFloat32 } from '@/lib/audioUtils'

export function usePlayback() {
  const ctxRef        = useRef<AudioContext | null>(null)
  const analyserRef   = useRef<AnalyserNode | null>(null)
  const sourcesRef    = useRef<AudioBufferSourceNode[]>([])
  const nextStartTime = useRef(0)

  const ensureCtx = () => {
    if (!ctxRef.current) {
      const ctx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE })
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.connect(ctx.destination)
      ctxRef.current = ctx
      analyserRef.current = analyser
    }
    return ctxRef.current
  }

  const enqueue = useCallback((raw: ArrayBuffer) => {
    const ctx = ensureCtx()
    const analyser = analyserRef.current!

    const int16   = new Int16Array(raw)
    const float32 = int16ToFloat32(int16)

    const audioBuffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE)
    audioBuffer.copyToChannel(float32, 0)

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(analyser)

    const now = ctx.currentTime
    if (nextStartTime.current < now + JITTER_BUFFER_SEC) {
      nextStartTime.current = now + JITTER_BUFFER_SEC
    }
    source.start(nextStartTime.current)
    nextStartTime.current += audioBuffer.duration

    sourcesRef.current.push(source)
    source.onended = () => {
      sourcesRef.current = sourcesRef.current.filter((s) => s !== source)
    }
  }, [])

  // Stop everything currently playing/scheduled, but keep the context alive (barge-in).
  const flush = useCallback(() => {
    for (const s of sourcesRef.current) {
      try { s.onended = null; s.stop() } catch { /* already stopped */ }
      try { s.disconnect() } catch { /* noop */ }
    }
    sourcesRef.current = []
    nextStartTime.current = 0
  }, [])

  // Normalized RMS (0–1) of current output — drives the orb while AI speaks.
  const getLevel = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return 0
    const buf = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128
      sum += v * v
    }
    return Math.min(Math.sqrt(sum / buf.length) * 3, 1)
  }, [])

  const stop = useCallback(() => {
    flush()
    ctxRef.current?.close()
    ctxRef.current = null
    analyserRef.current = null
  }, [flush])

  return { enqueue, flush, getLevel, stop }
}
