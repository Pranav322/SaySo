import { encodeWav } from './wavEncoder'
import { MAX_CLIP_SEC } from './constants'

// Decode any uploaded audio (wav/mp3/m4a), take channel 0, trim to MAX_CLIP_SEC,
// and re-encode as a mono 16-bit WAV. Normalizes format + length in one step.
export async function trimToWav(file: File): Promise<Blob> {
  const arrayBuf = await file.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(arrayBuf)
    const rate = decoded.sampleRate
    const maxSamples = Math.min(decoded.length, Math.floor(rate * MAX_CLIP_SEC))
    const ch0 = decoded.getChannelData(0)

    const int16 = new Int16Array(maxSamples)
    for (let i = 0; i < maxSamples; i++) {
      const s = Math.max(-1, Math.min(1, ch0[i]))
      int16[i] = s < 0 ? s * 32768 : s * 32767
    }
    return encodeWav([int16], rate)
  } finally {
    ctx.close()
  }
}
