import { describe, expect, it } from 'vitest'
import { getLessonCoinForgivenessCopy } from '@/lib/lessonCoinForgivenessCopy'

describe('lessonCoinForgivenessCopy', () => {
  it('provides zero-balance composer and help texts', () => {
    const copy = getLessonCoinForgivenessCopy()
    expect(copy.confirmTitleZeroBalance).toBe('Нет монет')
    expect(copy.confirmBodyZeroBalance).toContain('0 монет')
    expect(copy.zeroBalanceHelpTitle).toBe('Как получить монеты')
    expect(copy.zeroBalanceHelpMessage).toBe('Монеты можно заработать за золотые медали.')
  })

  it('provides applied ack copy', () => {
    const copy = getLessonCoinForgivenessCopy()
    expect(copy.appliedTitle).toBe('Монета списана')
    expect(copy.appliedBody(9)).toBe('Списали 1 🪙. Осталось: 9.')
    expect(copy.appliedCorrectAnswerPreview('Hi.')).toBe('Правильный ответ: Hi.')
    expect(copy.appliedGoldMedalHint).toContain('золот')
    expect(copy.appliedContinue).toBe('Продолжить')
  })

  it('uses adult button label for all audiences', () => {
    const copy = getLessonCoinForgivenessCopy()
    expect(copy.buttonLabel).toBe('🪙 Не считать ошибку')
    expect(copy.confirmYes).toBe('Да, помочь')
  })
})
