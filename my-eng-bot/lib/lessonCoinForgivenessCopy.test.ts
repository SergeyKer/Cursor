import { describe, expect, it } from 'vitest'
import {
  getLessonCoinForgivenessCopy,
  getLessonCoinForgivenessHelpLines,
} from '@/lib/lessonCoinForgivenessCopy'

describe('lessonCoinForgivenessCopy', () => {
  it('provides zero-balance composer and help texts', () => {
    const copy = getLessonCoinForgivenessCopy()
    expect(copy.confirmTitleZeroBalance).toBe('Нет монет')
    expect(copy.confirmBodyZeroBalance).toContain('0 монет')
    expect(copy.zeroBalanceHelpTitle).toBe('Как получить монеты')
    expect(getLessonCoinForgivenessHelpLines()).toEqual([
      'Монеты можно получить:',
      '— золотая медаль в уроке → 1 🪙',
      '— 3-й зачёт Челленджа → 1 🪙',
      '— 5-й зачёт Челленджа → 2 🪙',
      'Зачёты Челленджа — после золота по уроку.',
    ])
    expect(copy.zeroBalanceHelpMessage).toBe(getLessonCoinForgivenessHelpLines().join('\n'))
  })

  it('provides applied ack copy without correct-answer preview', () => {
    const copy = getLessonCoinForgivenessCopy()
    expect(copy.appliedTitle).toBe('Монета списана')
    expect(copy.appliedBody(9)).toBe('Списали 1 🪙. Осталось: 9.')
    expect(copy.appliedHowToGetCoins).toContain('золотая медаль')
    expect(copy.appliedHowToGetCoins).toContain('3-й зачёт')
    expect(copy.appliedHowToGetCoins).toContain('5-й зачёт')
    expect(copy.appliedHowToGetCoins).toContain('после золота')
    expect(copy.appliedContinue).toBe('Продолжить')
    expect(copy).not.toHaveProperty('appliedCorrectAnswerPreview')
    expect(copy).not.toHaveProperty('appliedGoldMedalHint')
  })

  it('uses adult button label for all audiences', () => {
    const copy = getLessonCoinForgivenessCopy()
    expect(copy.buttonLabel).toBe('🪙 Не считать ошибку')
    expect(copy.confirmYes).toBe('Да, помочь')
  })
})
