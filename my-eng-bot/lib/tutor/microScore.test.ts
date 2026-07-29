import { describe, expect, it } from 'vitest'
import { bandFromMicroScore, tutorMicroScoreRatio } from '@/lib/tutor/microScore'

describe('microScore', () => {
  it('ratios strong/mid/weak by ratio', () => {
    expect(bandFromMicroScore(4, 5)).toBe('strong')
    expect(bandFromMicroScore(5, 5)).toBe('strong')
    expect(bandFromMicroScore(2, 5)).toBe('mid')
    expect(bandFromMicroScore(1, 5)).toBe('weak')
    expect(bandFromMicroScore(0, 2)).toBe('weak')
    expect(bandFromMicroScore(2, 2)).toBe('strong')
    expect(bandFromMicroScore(1, 2)).toBe('mid')
  })

  it('guards empty total', () => {
    expect(tutorMicroScoreRatio(1, 0)).toBe(0)
    expect(bandFromMicroScore(1, 0)).toBe('weak')
  })
})
