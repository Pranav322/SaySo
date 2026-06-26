export function int16ToFloat32(int16: Int16Array): Float32Array<ArrayBuffer> {
  const buf = new ArrayBuffer(int16.length * 4)
  const f32 = new Float32Array(buf)
  for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768.0
  return f32
}
