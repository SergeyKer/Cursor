import { describe, expect, it } from 'vitest'
import { ENGVO_XAI_VOICES } from './constants'
import {
  avoidLeadingSameAsLast,
  createXaiVoiceShuffleDeck,
  pickNextXaiVoice,
  sanitizeXaiVoiceShuffleRemaining,
} from './xaiVoiceRotation'

function rngFrom(seq: number[]): () => number {
  let i = 0
  return () => {
    const v = seq[i % seq.length]!
    i += 1
    return v
  }
}

describe('xaiVoiceRotation', () => {
  it('sequential wraps Classic→New→Classic', () => {
    expect(
      pickNextXaiVoice({ mode: 'sequential', lastVoice: 'ara' }).voice
    ).toBe('eve')
    expect(
      pickNextXaiVoice({ mode: 'sequential', lastVoice: 'sal' }).voice
    ).toBe('altair')
    const last = ENGVO_XAI_VOICES[ENGVO_XAI_VOICES.length - 1]!
    expect(pickNextXaiVoice({ mode: 'sequential', lastVoice: last }).voice).toBe(
      ENGVO_XAI_VOICES[0]
    )
  })

  it('sequential starts at first when last is custom/outside pool', () => {
    expect(
      pickNextXaiVoice({ mode: 'sequential', lastVoice: 'custom-voice-xyz' }).voice
    ).toBe(ENGVO_XAI_VOICES[0])
  })

  it('random never repeats last when pool has alternatives', () => {
    const rng = rngFrom([0, 0.99, 0.5])
    for (let i = 0; i < 20; i++) {
      const { voice } = pickNextXaiVoice({
        mode: 'random',
        lastVoice: 'eve',
        rng,
      })
      expect(voice).not.toBe('eve')
      expect(ENGVO_XAI_VOICES).toContain(voice)
    }
  })

  it('shuffle yields all 26 unique then refills', () => {
    const rng = () => 0.42
    let remaining: string[] = []
    let last: string | null = null
    const seen = new Set<string>()
    for (let i = 0; i < 26; i++) {
      const picked = pickNextXaiVoice({
        mode: 'shuffle',
        lastVoice: last,
        shuffleRemaining: remaining,
        rng,
      })
      expect(seen.has(picked.voice)).toBe(false)
      seen.add(picked.voice)
      remaining = picked.shuffleRemaining
      last = picked.voice
    }
    expect(seen.size).toBe(26)
    expect(remaining).toHaveLength(0)

    const next = pickNextXaiVoice({
      mode: 'shuffle',
      lastVoice: last,
      shuffleRemaining: remaining,
      rng,
    })
    expect(ENGVO_XAI_VOICES).toContain(next.voice)
    expect(next.shuffleRemaining).toHaveLength(25)
  })

  it('sanitize drops unknown ids', () => {
    expect(sanitizeXaiVoiceShuffleRemaining(['eve', 'nope', 'luna'])).toEqual([
      'eve',
      'luna',
    ])
  })

  it('avoidLeadingSameAsLast swaps when needed', () => {
    const deck = createXaiVoiceShuffleDeck(() => 0)
    const fixed = ['eve', 'ara', 'leo'] as const
    const result = avoidLeadingSameAsLast([...fixed], 'eve', () => 0)
    expect(result[0]).not.toBe('eve')
    expect(result).toHaveLength(3)
    expect(new Set(result).size).toBe(3)
  })

  it('none keeps last built-in voice', () => {
    expect(pickNextXaiVoice({ mode: 'none', lastVoice: 'luna' }).voice).toBe('luna')
  })
})
