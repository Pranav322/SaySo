class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._targetRate = options.processorOptions?.targetRate ?? 16000;
    this._ratio = sampleRate / this._targetRate;
    this._remainder = 0;
  }

  process(inputs) {
    const float32 = inputs[0]?.[0];
    if (!float32) return true;

    const outLen = Math.floor((float32.length - this._remainder) / this._ratio);
    if (outLen <= 0) {
      this._remainder -= float32.length;
      return true;
    }

    const int16 = new Int16Array(outLen);
    let pos = this._remainder;

    for (let i = 0; i < outLen; i++) {
      const lo = Math.floor(pos);
      const hi = Math.min(lo + 1, float32.length - 1);
      const frac = pos - lo;
      const s = float32[lo] * (1 - frac) + float32[hi] * frac;
      const clamped = Math.max(-1, Math.min(1, s));
      int16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
      pos += this._ratio;
    }

    this._remainder = pos - float32.length;
    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor('mic-processor', MicProcessor);
