function toBase64(bytes: Uint8Array): string {
  if (typeof window === 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }

  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  if (typeof window === 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'))
  }

  const binary = atob(value)
  const output = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i)
  }
  return output
}

export function downsampleFloat32ToRate(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate = 24_000
): Float32Array {
  if (inputSampleRate === outputSampleRate) return input
  if (outputSampleRate > inputSampleRate) return input

  const ratio = inputSampleRate / outputSampleRate
  const nextLength = Math.max(1, Math.round(input.length / ratio))
  const output = new Float32Array(nextLength)

  let outputIndex = 0
  let inputIndex = 0
  while (outputIndex < nextLength) {
    const nextInputIndex = Math.min(input.length, Math.round((outputIndex + 1) * ratio))
    let sum = 0
    let count = 0
    while (inputIndex < nextInputIndex) {
      sum += input[inputIndex]
      count += 1
      inputIndex += 1
    }
    output[outputIndex] = count > 0 ? sum / count : 0
    outputIndex += 1
  }

  return output
}

export function encodePcm16Base64(samples: Float32Array): string {
  const pcmBytes = new Uint8Array(samples.length * 2)
  const view = new DataView(pcmBytes.buffer)
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  }
  return toBase64(pcmBytes)
}

export function decodePcm16Base64(base64: string): Float32Array {
  const bytes = fromBase64(base64)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const output = new Float32Array(bytes.byteLength / 2)
  for (let i = 0; i < output.length; i += 1) {
    output[i] = view.getInt16(i * 2, true) / 0x8000
  }
  return output
}
