'use client'
import { useRef, useState, useCallback } from 'react'
import { MIC_SAMPLE_RATE } from '@/lib/constants'

export function useMicCapture(onChunk: (buf: ArrayBuffer) => void) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ctxRef     = useRef<AudioContext | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const sampleRateRef = useRef<number>(MIC_SAMPLE_RATE)
  const onChunkRef = useRef(onChunk)
  onChunkRef.current = onChunk

  // nativeRate=true captures at the device's native rate (passthrough, higher
  // quality) for voice enrollment; default streams downsampled 16kHz for Omni.
  const start = useCallback(async (nativeRate = false) => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
      streamRef.current = stream

      const ctx = new AudioContext()
      ctxRef.current = ctx

      const targetRate = nativeRate ? ctx.sampleRate : MIC_SAMPLE_RATE
      sampleRateRef.current = targetRate

      await ctx.audioWorklet.addModule('/worklets/mic-processor.js')

      const worklet = new AudioWorkletNode(ctx, 'mic-processor', {
        processorOptions: { targetRate },
      })
      workletRef.current = worklet
      worklet.port.onmessage = (e) => onChunkRef.current(e.data)

      const source = ctx.createMediaStreamSource(stream)
      source.connect(worklet)
      // intentionally NOT connected to ctx.destination — avoids mic echo

      setIsCapturing(true)
    } catch (err) {
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow mic access and try again.'
        : `Mic error: ${err instanceof Error ? err.message : String(err)}`
      setError(msg)
    }
  }, [])

  const stop = useCallback(() => {
    workletRef.current?.disconnect()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    ctxRef.current?.close()
    workletRef.current = null
    streamRef.current  = null
    ctxRef.current     = null
    setIsCapturing(false)
  }, [])

  const getSampleRate = useCallback(() => sampleRateRef.current, [])

  return { start, stop, isCapturing, error, getSampleRate }
}
