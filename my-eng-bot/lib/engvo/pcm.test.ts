import { describe, expect, it } from 'vitest'
import {
  applyInputGain,
  downsampleToRate,
  ENGVO_XAI_INPUT_GAIN,
  floatTo16BitPCM,
} from './pcm'

describe('engvo pcm helpers', () => {
  it('amplifies and clamps input gain', () => {
    const input = new Float32Array([0.1, 0.8, -0.9])
    const out = applyInputGain(input, ENGVO_XAI_INPUT_GAIN)
    expect(out[0]).toBeCloseTo(0.18, 5)
    expect(out[1]).toBe(1)
    expect(out[2]).toBe(-1)
  })

  it('downsamples 48k to 24k by half length', () => {
    const input = new Float32Array(480)
    for (let i = 0; i < input.length; i++) input[i] = i
    const out = downsampleToRate(input, 48_000, 24_000)
    expect(out.length).toBe(240)
    expect(out[0]).toBe(0)
    expect(out[1]).toBe(2)
  })

  it('encodes float samples to little-endian pcm16', () => {
    const pcm = floatTo16BitPCM(new Float32Array([0, 1, -1]))
    const view = new DataView(pcm)
    expect(view.getInt16(0, true)).toBe(0)
    expect(view.getInt16(2, true)).toBe(0x7fff)
    expect(view.getInt16(4, true)).toBe(-0x8000)
  })
})
