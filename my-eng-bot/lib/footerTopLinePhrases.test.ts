import { describe, expect, it } from 'vitest'
import { formatRewardTopLine, getSessionTransitionTopLine } from './footerTopLinePhrases'

describe('footerTopLinePhrases', () => {
  it('formats lesson_xp_awarded top line by audience', () => {
    expect(
      formatRewardTopLine({
        reason: 'lesson_xp_awarded',
        amount: 8,
        audience: 'adult',
      })
    ).toBe('Хороший шаг. +8 к уровню.')
    expect(
      formatRewardTopLine({
        reason: 'lesson_xp_awarded',
        amount: 13,
        audience: 'child',
      })
    ).toBe('Отлично! +13 к уровню!')
  })

  it('falls back when reason is unknown', () => {
    expect(
      formatRewardTopLine({
        reason: 'unknown_reason',
        amount: 10,
        audience: 'adult',
      })
    ).toBe('+10. Отличный шаг вперёд.')
  })

  it('returns deterministic session transition phrases', () => {
    const textA = getSessionTransitionTopLine({
      source: 'lesson',
      audience: 'adult',
      seed: 'lesson:end',
    })
    const textB = getSessionTransitionTopLine({
      source: 'lesson',
      audience: 'adult',
      seed: 'lesson:end',
    })
    expect(textA).toBe(textB)
  })
})
