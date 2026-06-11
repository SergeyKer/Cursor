import { describe, expect, it } from 'vitest'
import {
  LESSON_PUZZLE_COMPLETE_MESSAGE,
  buildLessonAdvanceMessage,
  buildLessonNextPuzzleSubMessage,
  buildLessonNextVariantMessage,
  getLessonRepeatFooterMessage,
  getVariantInfo,
  shouldShowLessonTaskProgress,
} from '@/utils/footerMessages'
import type { Exercise } from '@/types/lesson'

describe('footerMessages', () => {
  it('returns 1-based variant progress for repeated exercises', () => {
    const exercise: Exercise = {
      type: 'translate',
      question: 'Base question',
      correctAnswer: 'Base answer',
      acceptedAnswers: ['Base answer'],
      variants: [
        {
          id: 'v1',
          question: 'Question 1',
          correctAnswer: 'Answer 1',
          acceptedAnswers: ['Answer 1'],
          hint: 'Hint 1',
          difficulty: 'easy',
        },
        {
          id: 'v2',
          question: 'Question 2',
          correctAnswer: 'Answer 2',
          acceptedAnswers: ['Answer 2'],
          hint: 'Hint 2',
          difficulty: 'medium',
        },
        {
          id: 'v3',
          question: 'Question 3',
          correctAnswer: 'Answer 3',
          acceptedAnswers: ['Answer 3'],
          hint: 'Hint 3',
          difficulty: 'hard',
        },
      ],
      currentVariantIndex: 1,
    }

    expect(getVariantInfo(exercise)).toEqual({ current: 2, total: 3 })
  })

  it('builds repeat footer text for intermediate and final variants', () => {
    expect(getLessonRepeatFooterMessage(3, { current: 1, total: 3 })).toBeNull()
    expect(getLessonRepeatFooterMessage(3, { current: 2, total: 3 })).toBe('Задание 2 из 3.')
    expect(getLessonRepeatFooterMessage(4, { current: 3, total: 3 })).toBe('Последнее задание (3 из 3).')
    expect(getLessonRepeatFooterMessage(6, { current: 2, total: 3 })).toBe('Задание 2 из 3.')
    expect(getLessonRepeatFooterMessage(6, { current: 3, total: 3 })).toBe('Последнее задание (3 из 3).')
    expect(getLessonRepeatFooterMessage(7, { current: 2, total: 3 })).toBe('Задание 2 из 3.')
    expect(getLessonRepeatFooterMessage(7, { current: 3, total: 3 })).toBe('Последнее задание (3 из 3).')
  })

  it('does not build repeat footer text outside repeated practice steps', () => {
    expect(getLessonRepeatFooterMessage(2, { current: 1, total: 3 })).toBeNull()
    expect(getVariantInfo(null)).toBeNull()
  })

  it('builds advance message with next step after completing step 1', () => {
    expect(
      buildLessonAdvanceMessage({
        currentStep: 0,
        totalSteps: 7,
        stepNumber: 1,
      })
    ).toBe('Верно. Шаг 2 из 7.')
  })

  it('adds local counter to next-variant feedback on multi-task steps', () => {
    expect(
      buildLessonNextVariantMessage({
        stepNumber: 3,
        nextVariantIndex: 1,
        variantTotal: 3,
      })
    ).toBe('Верно. Следующий вариант (2 из 3).')
  })

  it('keeps next-variant feedback plain outside multi-task steps', () => {
    expect(
      buildLessonNextVariantMessage({
        stepNumber: 2,
        nextVariantIndex: 1,
        variantTotal: 3,
      })
    ).toBe('Верно. Следующий вариант.')
  })

  it('adds first task counter when the next step has sub-tasks', () => {
    expect(
      buildLessonAdvanceMessage({
        currentStep: 1,
        totalSteps: 7,
        stepNumber: 2,
        nextStepNumber: 3,
        nextTaskTotal: 3,
      })
    ).toBe('Верно. Шаг 3 из 7 (задание 1 из 3).')
  })

  it('shows next step and first task when leaving a multi-task step', () => {
    expect(
      buildLessonAdvanceMessage({
        currentStep: 2,
        totalSteps: 7,
        stepNumber: 3,
        taskCurrent: 3,
        taskTotal: 3,
        nextStepNumber: 4,
        nextTaskTotal: 3,
      })
    ).toBe('Верно. Шаг 4 из 7 (задание 1 из 3).')
  })

  it('shows completed task counter when there is no next step', () => {
    expect(
      buildLessonAdvanceMessage({
        currentStep: 2,
        totalSteps: 7,
        stepNumber: 3,
        taskCurrent: 3,
        taskTotal: 3,
      })
    ).toBe('Верно. Шаг 3 из 7 (задание 3 из 3).')
  })

  it('builds puzzle advance message for the next simple step', () => {
    expect(
      buildLessonAdvanceMessage({
        base: LESSON_PUZZLE_COMPLETE_MESSAGE,
        currentStep: 4,
        totalSteps: 7,
        stepNumber: 5,
        taskCurrent: 3,
        taskTotal: 3,
        nextStepNumber: 6,
      })
    ).toBe('Отлично! Пазл собран. Шаг 6 из 7.')
  })

  it('omits task counter on step 5 when lesson ends on puzzle', () => {
    expect(
      buildLessonAdvanceMessage({
        base: LESSON_PUZZLE_COMPLETE_MESSAGE,
        currentStep: 4,
        totalSteps: 7,
        stepNumber: 5,
        taskCurrent: 3,
        taskTotal: 3,
      })
    ).toBe('Отлично! Пазл собран. Шаг 5 из 7.')
  })

  it('omits task counter when advancing to step 5 puzzle', () => {
    expect(
      buildLessonAdvanceMessage({
        currentStep: 3,
        totalSteps: 7,
        stepNumber: 4,
        nextStepNumber: 5,
        nextTaskTotal: 3,
      })
    ).toBe('Верно. Шаг 5 из 7.')
  })

  it('ignores task counter on simple steps without upcoming multi-task step', () => {
    expect(shouldShowLessonTaskProgress(2)).toBe(false)
    expect(shouldShowLessonTaskProgress(6)).toBe(true)
    expect(shouldShowLessonTaskProgress(7)).toBe(true)
    expect(
      buildLessonAdvanceMessage({
        currentStep: 1,
        totalSteps: 7,
        stepNumber: 2,
        taskCurrent: 1,
        taskTotal: 3,
      })
    ).toBe('Верно. Шаг 3 из 7.')
  })

  it('announces step 7 when completing step 6', () => {
    expect(
      buildLessonAdvanceMessage({
        currentStep: 5,
        totalSteps: 7,
        stepNumber: 6,
        nextStepNumber: 7,
      })
    ).toBe('Верно. Шаг 7 из 7.')
  })

  it('omits step counter when completing the final learning step', () => {
    expect(
      buildLessonAdvanceMessage({
        currentStep: 6,
        totalSteps: 7,
        stepNumber: 7,
      })
    ).toBe('Верно.')
  })

  it('omits step counter on final learning step with task variants', () => {
    expect(
      buildLessonAdvanceMessage({
        currentStep: 6,
        totalSteps: 7,
        stepNumber: 7,
        taskCurrent: 3,
        taskTotal: 3,
      })
    ).toBe('Верно.')
  })

  it('builds next puzzle sub message after first sub-puzzle', () => {
    expect(
      buildLessonNextPuzzleSubMessage({
        nextSubIndex: 1,
        subTotal: 3,
      })
    ).toBe('Верно. Следующий пазл (2 из 3).')
  })

  it('builds next puzzle sub message before final sub-puzzle', () => {
    expect(
      buildLessonNextPuzzleSubMessage({
        nextSubIndex: 2,
        subTotal: 3,
      })
    ).toBe('Верно. Следующий пазл (3 из 3).')
  })

  it('returns plain success when puzzle has a single sub-step', () => {
    expect(
      buildLessonNextPuzzleSubMessage({
        nextSubIndex: 0,
        subTotal: 1,
      })
    ).toBe('Верно.')
  })
})
