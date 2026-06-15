import { describe, expect, it } from 'vitest'
import { getLessonCoinForgivenessCopy } from '@/lib/lessonCoinForgivenessCopy'

describe('lessonCoinForgivenessCopy', () => {
  it('provides adult zero-balance composer and help texts', () => {
    const copy = getLessonCoinForgivenessCopy('adult')
    expect(copy.confirmTitleZeroBalance).toBe('Нет монет')
    expect(copy.confirmBodyZeroBalance).toContain('0 монет')
    expect(copy.zeroBalanceHelpTitle).toBe('Как получить монеты')
    expect(copy.zeroBalanceHelpMessage).toBe('Монеты можно заработать за золотые медали.')
  })

  it('provides simplified child zero-balance texts', () => {
    const copy = getLessonCoinForgivenessCopy('child')
    expect(copy.confirmTitleZeroBalance).toBe('Монеток нет')
    expect(copy.zeroBalanceHelpMessage).toBe('Монетки — за золотую медаль в уроке.')
    expect(copy.zeroBalanceHelpMessage).not.toBe(
      getLessonCoinForgivenessCopy('adult').zeroBalanceHelpMessage
    )
  })

  it('provides applied ack copy for adult', () => {
    const copy = getLessonCoinForgivenessCopy('adult')
    expect(copy.appliedTitle).toBe('Монета списана')
    expect(copy.appliedBody(9)).toBe('Списали 1 🪙. Осталось: 9.')
    expect(copy.appliedCorrectAnswerPreview('Hi.')).toBe('Правильный ответ: Hi.')
    expect(copy.appliedGoldMedalHint).toContain('золот')
    expect(copy.appliedContinue).toBe('Продолжить')
  })
})
