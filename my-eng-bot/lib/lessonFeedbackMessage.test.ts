import { describe, expect, it } from 'vitest'
import {
  formatLessonErrorFeedback,
  resolveLessonRepeatInstructionVerb,
} from '@/lib/lessonFeedbackMessage'

describe('formatLessonErrorFeedback', () => {
  it('returns hint only on first error', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'После from - одно слово.',
        correctAnswer: 'Russia',
        attemptNumber: 1,
      })
    ).toEqual({ hint: 'После from - одно слово.' })
  })

  it('includes repeatAnswer from second error', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'После from - одно слово.',
        correctAnswer: 'Russia',
        attemptNumber: 2,
      })
    ).toEqual({ hint: 'После from - одно слово.', repeatAnswer: 'Russia' })
  })

  it('skips repeatAnswer when correct answer is empty', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'Почти.',
        correctAnswer: '  ',
        attemptNumber: 3,
      })
    ).toEqual({ hint: 'Почти.' })
  })

  it('uses per-attempt number, not global step counter - first attempt stays hint-only even when step has 2+ errors', () => {
    const hint = 'После from - одно слово.'
    expect(
      formatLessonErrorFeedback({
        message: hint,
        correctAnswer: 'Russia',
        attemptNumber: 1,
      })
    ).toEqual({ hint })
    expect(
      formatLessonErrorFeedback({
        message: hint,
        correctAnswer: 'Russia',
        attemptNumber: 2,
      })
    ).toEqual({ hint, repeatAnswer: 'Russia' })
  })
})

describe('resolveLessonRepeatInstructionVerb', () => {
  it('uses Выбери/Выберите for choice chips', () => {
    expect(
      resolveLessonRepeatInstructionVerb({
        exerciseType: 'fill_choice',
        audience: 'child',
      })
    ).toBe('Выбери')
    expect(
      resolveLessonRepeatInstructionVerb({
        exerciseType: 'fill_choice',
        audience: 'adult',
      })
    ).toBe('Выберите')
    expect(
      resolveLessonRepeatInstructionVerb({
        exerciseType: 'micro_quiz',
        hasChoiceOptions: true,
        audience: 'adult',
      })
    ).toBe('Выберите')
  })

  it('uses Скажи/Напиши for text and voice steps', () => {
    expect(
      resolveLessonRepeatInstructionVerb({
        exerciseType: 'fill_text',
        hasMicrophone: true,
        audience: 'child',
      })
    ).toBe('Скажи')
    expect(
      resolveLessonRepeatInstructionVerb({
        exerciseType: 'fill_text',
        hasMicrophone: false,
        audience: 'adult',
      })
    ).toBe('Напишите')
  })
})
