'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
    <main className="min-h-screen bg-black px-6 py-12">
      <div className="mx-auto flex max-w-lg flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Create a persona</h1>
          <Link href="/" className="text-sm text-white/40 hover:text-white">← Back</Link>
        </div>

        {/* Name */}
        <label className="flex flex-col gap-2">
          <span className="text-sm text-white/60">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My manager"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white
                       placeholder:text-white/25 focus:border-white/40 focus:outline-none"
          />
        </label>

        {/* Instructions */}
        <label className="flex flex-col gap-2">
          <span className="text-sm text-white/60">How should they behave?</span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="You are my skeptical manager. You interrupt, challenge my ideas, and rarely give praise. Keep replies short."
            className="resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white
                       placeholder:text-white/25 focus:border-white/40 focus:outline-none"
          />
          <span className="text-xs text-white/30">
            Be specific and forceful — &ldquo;be rude, interrupt, mock me&rdquo; works better than &ldquo;be a bit tough.&rdquo;
          </span>
        </label>

        {/* Voice */}
        <div className="flex flex-col gap-3">
          <span className="text-sm text-white/60">Voice <span className="text-white/30">(10–20s of clear speech is ideal)</span></span>

          <div className="flex gap-2">
            {(['upload', 'record'] as VoiceMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setBlob(null); setError(null) }}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm transition ${
                  mode === m
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 text-white/50 hover:text-white'
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
                className="text-sm text-white/60 file:mr-4 file:rounded-lg file:border-0
                           file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
              />
              {processing && <p className="text-xs text-white/40">Processing… (trimming to {MAX_CLIP_SEC}s)</p>}
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
                  className="rounded-lg border border-white/20 px-4 py-3 text-sm text-white hover:bg-white/10"
                >
                  {voiceBlob ? 'Re-record' : '● Start recording'}
                </button>
              ) : (
                <button
                  onClick={finishRecording}
                  className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm
                             text-red-300 hover:bg-red-500/30"
                >
                  ■ Stop recording · {recordSec}s / {MAX_CLIP_SEC}s
                </button>
              )}
              {isCapturing && (
                <p className="text-xs text-white/40">Speak naturally for 10–20 seconds. Auto-stops at {MAX_CLIP_SEC}s.</p>
              )}
              {previewUrl && !isCapturing && (
                <audio controls src={previewUrl} className="w-full" />
              )}
              {micError && <p className="text-xs text-red-400">{micError}</p>}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-full bg-white px-8 py-4 font-semibold text-black transition
                     hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? 'Creating voice… (~5s)' : 'Create persona'}
        </button>
      </div>
    </main>
  )
}
