'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useMicCapture } from '@/hooks/useMicCapture'
import { usePlayback } from '@/hooks/usePlayback'
import { VoicePoweredOrb, OrbState } from '@/components/ui/voice-powered-orb'
import { API_BASE } from '@/lib/constants'
import { getSessionId } from '@/lib/session'

type Phase = 'idle' | 'connecting' | 'ready' | 'listening' | 'thinking' | 'speaking' | 'stopped'
type Mode = 'ptt' | 'hands_free'
type Voice = { id: string; gender: string }

const VAD_LEVEL = 0.28 // hands-free: mic level that counts as "user talking"

export default function ConversePage({ params }: { params: { personaId: string } }) {
  const { personaId } = params
  const [phase, setPhase] = useState<Phase>('idle')
  const [mode, setMode] = useState<Mode>('ptt')
  const [holding, setHolding] = useState(false)
  const [personaName, setPersonaName] = useState(personaId)
  const [isCustom, setIsCustom] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [voice, setVoice] = useState('')

  const phaseRef = useRef<Phase>('idle'); phaseRef.current = phase
  const modeRef = useRef<Mode>(mode); modeRef.current = mode
  const holdingRef = useRef(false)
  const micLevelRef = useRef(0)
  const bargeLockRef = useRef(false)

  const { enqueue, flush, getLevel: getPlaybackLevel, stop: stopPlayback } = usePlayback()

  const handleAudio = useCallback((buf: ArrayBuffer) => {
    if (phaseRef.current === 'thinking') setPhase('speaking')
    enqueue(buf)
  }, [enqueue])

  const handleEvent = useCallback((evt: { type: string; event?: string }) => {
    if (evt.type !== 'state') return
    switch (evt.event) {
      // speech_started/stopped only fire in hands-free (semantic_vad)
      case 'input_audio_buffer.speech_started': if (modeRef.current === 'hands_free') setPhase('listening'); break
      case 'input_audio_buffer.speech_stopped': if (modeRef.current === 'hands_free') setPhase('thinking'); break
      case 'response.created': setPhase('thinking'); break
      case 'response.done':
      case 'response.audio.done': setPhase(modeRef.current === 'ptt' ? 'ready' : 'listening'); break
    }
  }, [])

  const { status, sendBinary, sendText } = useWebSocket(personaId, handleAudio, voice || undefined, handleEvent, mode)

  const handleMicChunk = useCallback((buf: ArrayBuffer) => {
    // mic level for the orb (always)
    const int16 = new Int16Array(buf)
    let sum = 0
    for (let i = 0; i < int16.length; i++) { const v = int16[i] / 32768; sum += v * v }
    micLevelRef.current = Math.min(Math.sqrt(sum / int16.length) * 4, 1)

    if (modeRef.current === 'ptt') {
      // only send while the talk button/key is held
      if (holdingRef.current) sendBinary(buf)
      return
    }

    // hands-free: stream continuously + client-VAD barge-in
    sendBinary(buf)
    if (micLevelRef.current > VAD_LEVEL && phaseRef.current === 'speaking' && !bargeLockRef.current) {
      bargeLockRef.current = true
      flush()
      sendText({ type: 'barge_in' })
      setPhase('listening')
    }
    if (phaseRef.current !== 'speaking') bargeLockRef.current = false
  }, [sendBinary, flush, sendText])

  const { start: startMic, stop: stopMic, error: micError } = useMicCapture(handleMicChunk)

  // Push-to-talk press / release
  const press = useCallback(() => {
    if (modeRef.current !== 'ptt') return
    if (!['ready', 'listening', 'thinking', 'speaking'].includes(phaseRef.current)) return
    if (holdingRef.current) return
    if (phaseRef.current === 'speaking') { flush(); sendText({ type: 'barge_in' }) } // interrupt
    holdingRef.current = true
    setHolding(true)
    setPhase('listening')
  }, [flush, sendText])

  const release = useCallback(() => {
    if (!holdingRef.current) return
    holdingRef.current = false
    setHolding(false)
    sendText({ type: 'commit' })
    setPhase('thinking')
  }, [sendText])

  // Spacebar push-to-talk
  useEffect(() => {
    const isTyping = (el: EventTarget | null) =>
      el instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || isTyping(e.target)) return
      e.preventDefault(); press()
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target)) return
      e.preventDefault(); release()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [press, release])

  // Persona name + custom flag
  useEffect(() => {
    fetch(`${API_BASE}/personas`, { headers: { 'X-Session-Id': getSessionId() } })
      .then((r) => r.json())
      .then((list: { id: string; name: string; custom: boolean }[]) => {
        const m = list.find((p) => p.id === personaId)
        if (m) { setPersonaName(m.name); setIsCustom(m.custom) }
      })
      .catch(() => {})
  }, [personaId])

  useEffect(() => {
    fetch(`${API_BASE}/voices`).then((r) => r.json()).then(setVoices).catch(() => {})
  }, [])

  // WS status → phase
  useEffect(() => {
    if (status === 'open' && phase === 'connecting') setPhase(mode === 'ptt' ? 'ready' : 'listening')
    if ((status === 'error' || status === 'closed') && !['idle', 'stopped'].includes(phase)) setPhase('stopped')
  }, [status, phase, mode])

  const handleStart = useCallback(async () => {
    setPhase('connecting')
    await startMic()
  }, [startMic])

  const handleStop = useCallback(() => {
    stopMic(); stopPlayback(); setPhase('stopped')
  }, [stopMic, stopPlayback])

  const orbState: OrbState =
    phase === 'speaking' ? 'speaking'
    : phase === 'thinking' ? 'thinking'
    : phase === 'listening' ? 'listening'
    : 'idle'

  const getLevel = useCallback(
    () => (phaseRef.current === 'speaking' ? getPlaybackLevel() : micLevelRef.current),
    [getPlaybackLevel],
  )

  const statusText = (): string => {
    switch (phase) {
      case 'idle':       return 'Tap start when you’re ready'
      case 'connecting': return 'Connecting…'
      case 'ready':      return 'Hold the button (or Space) to talk'
      case 'listening':  return mode === 'ptt' ? 'Listening… release when done' : 'Your turn — just speak'
      case 'thinking':   return 'Thinking…'
      case 'speaking':   return mode === 'ptt' ? 'Speaking… hold to interrupt' : 'Speaking — talk to interrupt'
      case 'stopped':    return 'Session ended'
    }
  }

  const active = ['ready', 'listening', 'thinking', 'speaking'].includes(phase)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
      <Link href="/" className="absolute left-5 top-5 text-sm text-white/40 hover:text-white">← Back</Link>

      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="text-center">
          <p className="mb-1 text-xs uppercase tracking-widest text-white/30">Talking to</p>
          <h1 className="text-3xl font-bold text-white">{personaName}</h1>
        </div>

        <div className="h-64 w-64">
          <VoicePoweredOrb state={orbState} getLevel={getLevel} />
        </div>

        <p className="h-5 text-sm text-white/60">{statusText()}</p>

        {micError && <p className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-300">{micError}</p>}

        {/* Pre-start: mode toggle, voice picker, Start */}
        {phase === 'idle' && (
          <>
            <div className="flex gap-2">
              {(['ptt', 'hands_free'] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`rounded-lg border px-4 py-2 text-sm transition ${
                    mode === m ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-white/50 hover:text-white'
                  }`}>
                  {m === 'ptt' ? 'Push to talk' : 'Hands-free'}
                </button>
              ))}
            </div>
            {mode === 'hands_free' && (
              <p className="-mt-4 text-xs text-amber-400/70">Experimental — use headphones</p>
            )}

            {!isCustom && voices.length > 0 && (
              <label className="flex flex-col items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-white/30">Voice</span>
                <select value={voice} onChange={(e) => setVoice(e.target.value)}
                  className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-center text-white focus:border-white/40 focus:outline-none">
                  <option value="">Default</option>
                  <optgroup label="Male">
                    {voices.filter((v) => v.gender === 'male').map((v) => <option key={v.id} value={v.id}>{v.id}</option>)}
                  </optgroup>
                  <optgroup label="Female">
                    {voices.filter((v) => v.gender === 'female').map((v) => <option key={v.id} value={v.id}>{v.id}</option>)}
                  </optgroup>
                </select>
              </label>
            )}

            <button onClick={handleStart}
              className="rounded-full bg-white px-10 py-4 text-lg font-semibold text-black transition hover:bg-white/90">
              Start Conversation
            </button>
          </>
        )}

        {/* Active: push-to-talk button (ptt) + End */}
        {active && mode === 'ptt' && (
          <button
            onPointerDown={(e) => { e.preventDefault(); press() }}
            onPointerUp={(e) => { e.preventDefault(); release() }}
            onPointerLeave={() => release()}
            className={`select-none rounded-full px-12 py-5 text-lg font-semibold transition ${
              holding ? 'bg-sky-400 text-black scale-105' : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {holding ? 'Listening…' : 'Hold to talk'}
          </button>
        )}

        {active && (
          <button onClick={handleStop}
            className="rounded-full border border-red-500/40 px-8 py-2 text-sm text-red-300/80 transition hover:bg-red-500/20">
            End
          </button>
        )}

        {phase === 'stopped' && (
          <Link href="/" className="rounded-full border border-white/20 px-8 py-3 text-sm text-white/70 hover:border-white/40 hover:text-white">
            ← Back to personas
          </Link>
        )}
      </div>
    </main>
  )
}
