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
    ).toBe('Хороший шаг. +8 XP к уровню.')
    expect(
      formatRewardTopLine({
        reason: 'lesson_xp_awarded',
        amount: 13,
        audience: 'child',
      })
    ).toBe('Отлично! +13 XP к уровню!')
  })

  it('formats reward top line by audience and reason', () => {
    expect(
      formatRewardTopLine({
        reason: 'lesson_completed',
        amount: 45,
        audience: 'adult',
      })
    ).toBe('Урок завершён. +45 XP за прогресс.')
    expect(
      formatRewardTopLine({
        reason: 'lesson_completed',
        amount: 45,
        audience: 'child',
      })
    ).toBe('Урок готов! +45 XP!')
  })

  it('falls back when reason is unknown', () => {
    expect(
      formatRewardTopLine({
        reason: 'unknown_reason',
        amount: 10,
        audience: 'adult',
      })
    ).toBe('+10 XP. Отличный шаг вперёд.')
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
