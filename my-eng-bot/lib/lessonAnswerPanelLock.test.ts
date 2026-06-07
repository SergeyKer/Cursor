import { describe, expect, it } from 'vitest'
import { getAllStructuredLessons } from '@/lib/structuredLessons'
import {
  isLessonAnswerPanelLocked,
  isLessonChoiceInteractionDisabled,
  isLessonChoicePanelFrozen,
  LESSON_CHECKING_MESSAGE,
  LESSON_CHECKING_REVEAL_MS,
  LESSON_SUCCESS_HOLD_MS,
  LESSON_VALIDATION_DELAY_MS,
} from '@/lib/lessonAnswerPanelLock'
import { PRACTICE_FEEDBACK_MS } from '@/lib/practice/practiceAnswerPanelLock'
import { PRACTICE_ANSWER_REVEAL_MS, PRACTICE_CHECKING_MS } from '@/lib/practice/practiceAnswerPanelLock'
import type { Exercise } from '@/types/lesson'

describe('LESSON_CHECKING_MESSAGE', () => {
  it('matches practice checking copy', () => {
    expect(LESSON_CHECKING_MESSAGE).toBe('Engvo проверяет ответ...')
  })
})

describe('lesson checking timing', () => {
  it('uses the same reveal and validation delays as practice', () => {
    expect(LESSON_CHECKING_REVEAL_MS).toBe(PRACTICE_ANSWER_REVEAL_MS)
    expect(LESSON_VALIDATION_DELAY_MS).toBe(PRACTICE_ANSWER_REVEAL_MS + PRACTICE_CHECKING_MS)
    expect(LESSON_SUCCESS_HOLD_MS).toBe(PRACTICE_FEEDBACK_MS)
  })
})

describe('isLessonAnswerPanelLocked', () => {
  it('locks while checking', () => {
    expect(isLessonAnswerPanelLocked('checking', undefined)).toBe(true)
    expect(isLessonAnswerPanelLocked('checking', 'error')).toBe(true)
  })

  it('locks on success feedback only', () => {
    expect(isLessonAnswerPanelLocked('feedback', 'success')).toBe(true)
    expect(isLessonAnswerPanelLocked('feedback', 'error')).toBe(false)
    expect(isLessonAnswerPanelLocked('feedback', undefined)).toBe(false)
  })

  it('unlocks on idle and completed', () => {
    expect(isLessonAnswerPanelLocked('idle', 'success')).toBe(false)
    expect(isLessonAnswerPanelLocked('completed', 'success')).toBe(false)
  })

  it('locks while question reveal is in progress', () => {
    expect(isLessonAnswerPanelLocked('idle', undefined, true)).toBe(true)
  })
})

describe('isLessonChoicePanelFrozen', () => {
  it('freezes only on success feedback or hold', () => {
    expect(isLessonChoicePanelFrozen('checking', undefined, false)).toBe(false)
    expect(isLessonChoicePanelFrozen('checking', 'error', false)).toBe(false)
    expect(isLessonChoicePanelFrozen('feedback', 'error', false)).toBe(false)
    expect(isLessonChoicePanelFrozen('feedback', 'success', false)).toBe(true)
    expect(isLessonChoicePanelFrozen('idle', undefined, true)).toBe(true)
    expect(isLessonChoicePanelFrozen('idle', undefined, false, true)).toBe(true)
  })
})

describe('isLessonChoiceInteractionDisabled', () => {
  it('disables on checking and success freeze', () => {
    expect(isLessonChoiceInteractionDisabled('checking', undefined, false)).toBe(true)
    expect(isLessonChoiceInteractionDisabled('feedback', 'error', false)).toBe(false)
    expect(isLessonChoiceInteractionDisabled('feedback', 'success', false)).toBe(true)
  })
})

function collectChoiceExerciseSteps(exercise: Exercise | undefined, scope: string) {
  if (!exercise) return [] as string[]
  if (exercise.type === 'fill_choice' || exercise.type === 'micro_quiz') {
    return [scope]
  }
  return []
}

describe('structured lessons choice panel coverage', () => {
  it('documents fill_choice and micro_quiz steps in base and repeat profiles', () => {
    const scopes: string[] = []

    for (const lesson of getAllStructuredLessons()) {
      lesson.steps.forEach((step, index) => {
        scopes.push(
          ...collectChoiceExerciseSteps(step.exercise, `${lesson.id}:step${step.stepNumber ?? index + 1}`)
        )
      })

      for (const profile of lesson.repeatConfig?.variantProfiles ?? []) {
        profile.steps?.forEach((step, index) => {
          scopes.push(
            ...collectChoiceExerciseSteps(
              step.exercise,
              `${lesson.id}:${profile.id}:step${step.stepNumber ?? index + 1}`
            )
          )
        })
      }
    }

    expect(scopes.length).toBeGreaterThan(0)
    expect(scopes.every((scope) => scope.length > 0)).toBe(true)
  })
})
