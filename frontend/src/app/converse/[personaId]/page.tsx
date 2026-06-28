'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useMicCapture } from '@/hooks/useMicCapture'
import { usePlayback } from '@/hooks/usePlayback'
import { VoicePoweredOrb, OrbState } from '@/components/ui/voice-powered-orb'
import { VoicePicker } from '@/components/VoicePicker'
import { AppNav } from '@/components/AppNav'
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
  // Gate: drop audio chunks belonging to a response the user interrupted.
  // Re-opened only when a NEW response starts (response.created).
  const acceptAudioRef = useRef(true)

  const { enqueue, flush, getLevel: getPlaybackLevel, stop: stopPlayback } = usePlayback()

  const handleAudio = useCallback((buf: ArrayBuffer) => {
    if (!acceptAudioRef.current) return // interrupted response — discard stray chunks
    if (phaseRef.current === 'thinking') setPhase('speaking')
    enqueue(buf)
  }, [enqueue])

  const handleEvent = useCallback((evt: { type: string; event?: string }) => {
    if (evt.type !== 'state') return
    switch (evt.event) {
      // speech_started/stopped only fire in hands-free (semantic_vad)
      case 'input_audio_buffer.speech_started': if (modeRef.current === 'hands_free') setPhase('listening'); break
      case 'input_audio_buffer.speech_stopped': if (modeRef.current === 'hands_free') setPhase('thinking'); break
      case 'response.created': acceptAudioRef.current = true; setPhase('thinking'); break
      case 'response.done':
      case 'response.audio.done': setPhase(modeRef.current === 'ptt' ? 'ready' : 'listening'); break
    }
  }, [])

  const { status, sendBinary, sendText } = useWebSocket(personaId, handleAudio, voice || undefined, handleEvent, mode)

  // Stop the AI immediately: discard buffered audio, block stray chunks, tell server to cancel.
  const interrupt = useCallback(() => {
    acceptAudioRef.current = false
    flush()
    sendText({ type: 'barge_in' })
  }, [flush, sendText])

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
      interrupt()
      setPhase('listening')
    }
    if (phaseRef.current !== 'speaking') bargeLockRef.current = false
  }, [sendBinary, interrupt])

  const { start: startMic, stop: stopMic, error: micError } = useMicCapture(handleMicChunk)

  // Push-to-talk press / release
  const press = useCallback(() => {
    if (modeRef.current !== 'ptt') return
    if (!['ready', 'listening', 'thinking', 'speaking'].includes(phaseRef.current)) return
    if (holdingRef.current) return
    // Interrupt a reply that's playing OR still being generated.
    if (phaseRef.current === 'speaking' || phaseRef.current === 'thinking') interrupt()
    holdingRef.current = true
    setHolding(true)
    setPhase('listening')
  }, [interrupt])

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
    <main className="grain relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <AppNav />
      {/* state-tinted ambient glow behind the orb */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[130px] transition-colors duration-1000"
        style={{
          background:
            phase === 'speaking' ? 'radial-gradient(circle, rgba(232,161,60,0.30), transparent 70%)'
            : phase === 'thinking' ? 'radial-gradient(circle, rgba(138,123,216,0.28), transparent 70%)'
            : phase === 'listening' ? 'radial-gradient(circle, rgba(111,168,199,0.28), transparent 70%)'
            : 'radial-gradient(circle, rgba(111,168,199,0.10), transparent 70%)',
        }}
      />

      <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-8 px-6 pb-10">
        <div className="text-center">
          <p className="kicker mb-2">Talking to</p>
          <h1 className="font-display text-[clamp(2rem,6vw,3rem)] font-light tracking-[-0.01em]">{personaName}</h1>
        </div>

        <div className="h-64 w-64 animate-float-slow">
          <VoicePoweredOrb state={orbState} getLevel={getLevel} />
        </div>

        <p className="h-5 text-sm text-[var(--text-dim)]">{statusText()}</p>

        {micError && <p className="rounded-xl border border-[#c8542a]/30 bg-[#c8542a]/10 px-4 py-3 text-sm text-[var(--accent-soft)]">{micError}</p>}

        {/* Pre-start: mode toggle, voice picker, Start */}
        {phase === 'idle' && (
          <>
            <div className="flex gap-2">
              {(['ptt', 'hands_free'] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`rounded-xl border px-4 py-2 text-sm transition ${
                    mode === m ? 'border-[#FF5C39]/50 bg-[#FF5C39]/10 text-[var(--text)]' : 'border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line)] hover:text-[var(--text)]'
                  }`}>
                  {m === 'ptt' ? 'Push to talk' : 'Hands-free'}
                </button>
              ))}
            </div>
            {mode === 'hands_free' && (
              <p className="-mt-4 text-xs text-[#FF5C39]/80">Experimental — use headphones</p>
            )}

            {!isCustom && voices.length > 0 && (
              <VoicePicker voices={voices} value={voice} onChange={setVoice} />
            )}

            <button onClick={handleStart}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-10 py-4 text-lg font-semibold text-[var(--bg)]
                         shadow-[0_0_44px_-10px_rgba(232,161,60,0.65)] transition hover:bg-[var(--accent-soft)]">
              Start conversation <span className="transition-transform group-hover:translate-x-1">→</span>
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
              holding
                ? 'scale-105 bg-[#6fa8c7] text-[var(--bg)] shadow-[0_0_44px_-8px_rgba(111,168,199,0.8)]'
                : 'bg-[var(--text)] text-[var(--bg)] hover:bg-white'
            }`}
          >
            {holding ? 'Listening…' : 'Hold to talk'}
          </button>
        )}

        {active && (
          <button onClick={handleStop}
            className="rounded-full border border-[#c8542a]/40 px-8 py-2 text-sm text-[#f0a987]/80 transition hover:bg-[#c8542a]/15">
            End
          </button>
        )}

        {phase === 'stopped' && (
          <Link href="/app" className="rounded-full border border-[var(--line)] px-8 py-3 text-sm text-[var(--text-dim)] transition hover:border-[var(--line)] hover:text-[var(--text)]">
            ← Back to personas
          </Link>
        )}
      </div>
    </main>
  )
}
