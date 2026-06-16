import { describe, expect, it } from 'vitest'
import { COIN_LESSON_GOLD_AWARD, resolveLessonCoinAward } from './coinAwards'

describe('resolveLessonCoinAward', () => {
  it('awards +1 on first gold core for lessonId', () => {
    const result = resolveLessonCoinAward({
      lessonId: 'lesson-a',
      coreMedal: 'gold',
      lessonGoldClaimed: {},
    })
    expect(result).toEqual({ amount: COIN_LESSON_GOLD_AWARD, reason: 'lesson_gold' })
  })

  it('returns zero when lessonId already claimed', () => {
    const result = resolveLessonCoinAward({
      lessonId: 'lesson-a',
      coreMedal: 'gold',
      lessonGoldClaimed: { 'lesson-a': true },
    })
    expect(result).toEqual({ amount: 0, reason: 'lesson_gold_already_claimed' })
  })

  it('returns zero for silver and bronze', () => {
    expect(
      resolveLessonCoinAward({
        lessonId: 'lesson-a',
        coreMedal: 'silver',
        lessonGoldClaimed: {},
      })
    ).toEqual({ amount: 0, reason: 'lesson_not_gold' })

    expect(
      resolveLessonCoinAward({
        lessonId: 'lesson-a',
        coreMedal: 'bronze',
        lessonGoldClaimed: {},
      })
    ).toEqual({ amount: 0, reason: 'lesson_not_gold' })
  })
})
