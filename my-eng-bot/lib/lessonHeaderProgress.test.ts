import { describe, expect, it } from 'vitest'
import {
  formatLessonHeaderProgressAriaLabel,
  formatLessonHeaderProgressLabel,
} from '@/lib/lessonHeaderProgress'

describe('formatLessonHeaderProgressLabel', () => {
  it('returns Готово on finale', () => {
    expect(
      formatLessonHeaderProgressLabel({
        isFinale: true,
        currentStepIndex: 6,
        totalSteps: 7,
      })
    ).toBe('Готово')
  })

  it('returns step only when no multi-task step', () => {
    expect(
      formatLessonHeaderProgressLabel({
        isFinale: false,
        currentStepIndex: 0,
        totalSteps: 7,
        stepNumber: 1,
      })
    ).toBe('1/7')
  })

  it('appends variant progress on multi-task steps', () => {
    expect(
      formatLessonHeaderProgressLabel({
        isFinale: false,
        currentStepIndex: 2,
        totalSteps: 7,
        stepNumber: 3,
        variantProgress: { current: 1, total: 3 },
      })
    ).toBe('3/7 · 2/3')
  })

  it('appends puzzle sub-progress on step 5', () => {
    expect(
      formatLessonHeaderProgressLabel({
        isFinale: false,
        currentStepIndex: 4,
        totalSteps: 7,
        stepNumber: 5,
        puzzleSubIndex: 1,
        puzzleSubTotal: 3,
      })
    ).toBe('5/7 · 2/3')
  })
})

describe('formatLessonHeaderProgressAriaLabel', () => {
  it('describes variant suffix in Russian', () => {
    expect(
      formatLessonHeaderProgressAriaLabel({
        isFinale: false,
        currentStepIndex: 2,
        totalSteps: 7,
        stepNumber: 3,
        variantProgress: { current: 0, total: 2 },
      })
    ).toBe('Шаг 3 из 7, вариант 1/2')
  })
})
