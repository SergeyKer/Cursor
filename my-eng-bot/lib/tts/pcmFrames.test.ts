import { describe, expect, it } from 'vitest'
import { concatUint8, takeEvenPcmFrames } from '@/lib/tts/pcmFrames'

describe('takeEvenPcmFrames', () => {
  it('holds a trailing odd byte until the next chunk', () => {
    const first = takeEvenPcmFrames(new Uint8Array(0), new Uint8Array([1, 2, 3]))
    expect(Array.from(first.frames)).toEqual([1, 2])
    expect(Array.from(first.rest)).toEqual([3])
    const second = takeEvenPcmFrames(first.rest, new Uint8Array([4, 5]))
    expect(Array.from(second.frames)).toEqual([3, 4])
    expect(Array.from(second.rest)).toEqual([5])
  })

  it('passes through even chunks', () => {
    const got = takeEvenPcmFrames(new Uint8Array(0), new Uint8Array([9, 8, 7, 6]))
    expect(Array.from(got.frames)).toEqual([9, 8, 7, 6])
    expect(got.rest.length).toBe(0)
  })
})

describe('concatUint8', () => {
  it('joins chunks into one buffer', () => {
    const buf = concatUint8([new Uint8Array([1, 2]), new Uint8Array([3])])
    expect(Array.from(new Uint8Array(buf))).toEqual([1, 2, 3])
  })
})
