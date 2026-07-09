import { ENGVO_XAI_PCM_SAMPLE_RATE } from '@/lib/engvo/constants'

/** Soft boost so server VAD (~0.72) sees phone speech more reliably. */
export const ENGVO_XAI_INPUT_GAIN = 1.8

/** Smaller ScriptProcessor buffer (~85 ms at 24 kHz) for lower uplink latency on mobile. */
export const ENGVO_XAI_SCRIPT_PROCESSOR_BUFFER = 2048

/** Skip mic append when WS outbound buffer is this large (bytes). */
export const ENGVO_XAI_WS_BUFFERED_AMOUNT_LIMIT = 256_000

export function applyInputGain(
  input: Float32Array,
  gain: number = ENGVO_XAI_INPUT_GAIN
): Float32Array {
  if (gain === 1) return input
  const out = new Float32Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const sample = (input[i] ?? 0) * gain
    out[i] = Math.max(-1, Math.min(1, sample))
  }
  return out
}

export function downsampleToRate(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number = ENGVO_XAI_PCM_SAMPLE_RATE
): Float32Array {
  if (inputSampleRate === outputSampleRate) return input
  const ratio = inputSampleRate / outputSampleRate
  const newLength = Math.max(1, Math.round(input.length / ratio))
  const result = new Float32Array(newLength)
  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio)
    result[i] = input[start] ?? 0
  }
  return result
}

export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0))
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return buffer
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
