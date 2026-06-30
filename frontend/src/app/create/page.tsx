'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMicCapture } from '@/hooks/useMicCapture'
import { encodeWav } from '@/lib/wavEncoder'
import { trimToWav } from '@/lib/audioTrim'
import { getSessionId } from '@/lib/session'
import { API_BASE, MAX_CLIP_SEC, MAX_UPLOAD_BYTES } from '@/lib/constants'

type VoiceMode = 'upload' | 'record'

export default function CreatePersona() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [mode, setMode] = useState<VoiceMode>('upload')

  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [recordSec, setRecordSec] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recording: accumulate native-rate Int16 chunks
  const chunksRef = useRef<Int16Array[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { start, stop, isCapturing, error: micError, getSampleRate } =
    useMicCapture((buf) => chunksRef.current.push(new Int16Array(buf)))

  const setBlob = useCallback((blob: Blob | null) => {
    setVoiceBlob(blob)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return blob ? URL.createObjectURL(blob) : null
    })
  }, [])

  const finishRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    stop()
    setBlob(encodeWav(chunksRef.current, getSampleRate()))
  }, [stop, getSampleRate, setBlob])

  const startRecording = useCallback(async () => {
    chunksRef.current = []
    setBlob(null)
    setRecordSec(0)
    setError(null)
    await start(true) // native rate for enrollment quality
    timerRef.current = setInterval(() => {
      setRecordSec((s) => {
        const next = s + 1
        if (next >= MAX_CLIP_SEC) finishRecording() // auto-stop at the cap
        return next
      })
    }, 1000)
  }, [start, setBlob, finishRecording])

  const handleUpload = useCallback(async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setBlob(null)
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File too large (max 10MB). Pick a shorter clip.')
      return
    }
    setProcessing(true)
    try {
      // decode + trim to <=30s mono WAV (also normalizes mp3/m4a)
      setBlob(await trimToWav(file))
    } catch {
      setError('Could not read that audio file. Try a WAV, MP3, or M4A.')
    } finally {
      setProcessing(false)
    }
  }, [setBlob])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const canSubmit = name.trim() && instructions.trim() && voiceBlob && !submitting && !isCapturing

  const handleSubmit = useCallback(async () => {
    if (!voiceBlob) return
    setError(null)
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('name', name.trim())
      form.append('instructions', instructions.trim())
      form.append('audio', voiceBlob, 'voice.wav')

      const resp = await fetch(`${API_BASE}/personas`, {
        method: 'POST',
        headers: { 'X-Session-Id': getSessionId() },
        body: form,
      })
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body.detail ?? `Request failed (${resp.status})`)
      }
      const created = await resp.json()
      router.push(`/converse/${created.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }, [voiceBlob, name, instructions, router])

  return (
    <main className="grain relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] pt-16">
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[460px] w-[640px] -translate-x-1/2 opacity-35 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(138,123,216,0.20) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto flex max-w-lg flex-col gap-8 px-6 py-14">
        <div>
          <p className="kicker mb-3">New persona</p>
          <h1 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] font-light leading-none tracking-[-0.01em]">
            Build your own.
          </h1>
        </div>

        {/* Name */}
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My manager"
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--text)]
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
            placeholder="You are my skeptical manager. You interrupt, challenge my ideas, and rarely give praise. Keep replies short."
            className="resize-none rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--text)]
                       placeholder:text-[var(--text-faint)] transition focus:border-[#FF5C39]/50 focus:outline-none"
          />
          <span className="text-xs text-[var(--text-faint)]">
            Be specific and forceful — &ldquo;be rude, interrupt, mock me&rdquo; works better than &ldquo;be a bit tough.&rdquo;
          </span>
        </label>

        {/* Voice */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">
            Voice <span className="text-[var(--line)]">· 10–20s of clear speech is ideal</span>
          </span>

          <div className="flex gap-2">
            {(['upload', 'record'] as VoiceMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setBlob(null); setError(null) }}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm transition ${
                  mode === m
                    ? 'border-[#FF5C39]/50 bg-[#FF5C39]/10 text-[var(--text)]'
                    : 'border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line)] hover:text-[var(--text)]'
                }`}
              >
                {m === 'upload' ? 'Upload file' : 'Record'}
              </button>
            ))}
          </div>

          {mode === 'upload' && (
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="audio/wav,audio/mpeg,audio/mp4,audio/x-m4a"
                onChange={(e) => handleUpload(e.target.files?.[0])}
                className="text-sm text-[var(--text-dim)] file:mr-4 file:rounded-lg file:border-0
                           file:bg-[var(--line)] file:px-4 file:py-2 file:text-[var(--text)] hover:file:bg-[var(--line)]"
              />
              {processing && <p className="text-xs text-[var(--text-dim)]">Processing… (trimming to {MAX_CLIP_SEC}s)</p>}
              {voiceBlob && !processing && previewUrl && (
                <audio controls src={previewUrl} className="w-full" />
              )}
            </div>
          )}

          {mode === 'record' && (
            <div className="flex flex-col gap-3">
              {!isCapturing ? (
                <button
                  onClick={startRecording}
                  className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--text)] transition hover:border-[var(--line)] hover:bg-[var(--surface)]"
                >
                  {voiceBlob ? '↺ Re-record' : '● Start recording'}
                </button>
              ) : (
                <button
                  onClick={finishRecording}
                  className="rounded-xl border border-[#c8542a]/50 bg-[#c8542a]/15 px-4 py-3 text-sm
                             text-[var(--accent-soft)] transition hover:bg-[#c8542a]/25"
                >
                  ■ Stop recording · {recordSec}s / {MAX_CLIP_SEC}s
                </button>
              )}
              {isCapturing && (
                <p className="text-xs text-[var(--text-dim)]">Speak naturally for 10–20 seconds. Auto-stops at {MAX_CLIP_SEC}s.</p>
              )}
              {previewUrl && !isCapturing && (
                <audio controls src={previewUrl} className="w-full" />
              )}
              {micError && <p className="text-xs text-[var(--accent-soft)]">{micError}</p>}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-[#c8542a]/30 bg-[#c8542a]/10 px-4 py-3 text-sm text-[var(--accent-soft)]">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-8 py-4 font-semibold text-[var(--bg)]
                     shadow-[0_0_40px_-10px_rgba(232,161,60,0.6)] transition hover:bg-[var(--accent-soft)]
                     disabled:cursor-not-allowed disabled:opacity-25 disabled:shadow-none"
        >
          {submitting ? 'Creating voice… (~5s)' : <>Create persona <span className="transition-transform group-hover:translate-x-1">→</span></>}
        </button>
      </div>
    </main>
  )
}
