import { describe, expect, it } from 'vitest'
import { formatLessonCoinAwardLine } from './lessonCoinAwardCopy'

describe('lessonCoinAwardCopy', () => {
  it('formats all finale coin reasons for adult', () => {
    expect(
      formatLessonCoinAwardLine({
        coinAward: { amount: 1, reason: 'lesson_gold' },
        audience: 'adult',
      })
    ).toBe('+1 🪙 за золотую медаль.')

    expect(
      formatLessonCoinAwardLine({
        coinAward: { amount: 0, reason: 'lesson_gold_already_claimed' },
        audience: 'adult',
      })
    ).toBe('Монета за эту тему уже получена.')

    expect(
      formatLessonCoinAwardLine({
        coinAward: { amount: 0, reason: 'lesson_not_gold' },
        audience: 'adult',
      })
    ).toBe('До монеты: золото (90%+ по уроку).')
  })
})
