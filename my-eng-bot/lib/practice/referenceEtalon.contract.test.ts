import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import { buildReferenceFallbackQuestions } from '@/lib/practice/referenceFallbackQuestion'
import { isTranslateStylePrompt } from '@/lib/practice/prompt/promptSourceUtils'
import { REFERENCE_STEP_MAP_TYPES } from '@/lib/practice/prompt/promptSourceTypes'
import { resolvePracticeLessonStep } from '@/lib/practice/resolvePracticeLessonStep'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { PracticeExerciseType } from '@/types/practice'

const REFERENCE_ETALON_TYPES = [...REFERENCE_STEP_MAP_TYPES] as PracticeExerciseType[]

describe('reference etalon contract', () => {
  for (const lessonId of ['1', '2', '3', '4'] as const) {
    describe(`lesson ${lessonId}`, () => {
      for (const referenceType of REFERENCE_ETALON_TYPES) {
        it(`builds 7 unique ${referenceType} scenarios`, () => {
          const lesson = getStructuredLessonById(lessonId)
          expect(lesson).not.toBeNull()

          const questions = buildReferenceFallbackQuestions({
            lesson: lesson!,
            referenceExerciseType: referenceType,
            referenceTotal: 7,
          })

          expect(questions).toHaveLength(7)
          expect(questions.every((question) => question.type === referenceType)).toBe(true)

          const fingerprints = questions
            .map((question) => buildPracticeQuestionFingerprintFromQuestion(question))
            .filter(Boolean)
          expect(new Set(fingerprints).size).toBeGreaterThanOrEqual(6)

          for (const question of questions) {
            expect(question.prompt).toMatch(/[А-Яа-яЁё]/)
            if (referenceType === 'free-response') {
              expect(isTranslateStylePrompt(question.prompt)).toBe(false)
            }
            if (referenceType === 'dropdown-fill') {
              expect(question.options?.length ?? 0).toBeGreaterThanOrEqual(3)
            }
            if (referenceType === 'dictation' || referenceType === 'listening-select') {
              expect(question.audioText).toBeTruthy()
              expect(question.prompt).not.toContain(question.targetAnswer)
            }
            if (referenceType === 'boss-challenge') {
              expect(question.minWords).toBeGreaterThanOrEqual(5)
            }
          }
        })
      }
    })
  }

  it('keeps passthrough mapping for context-clue #3', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const resolved = resolvePracticeLessonStep({
      lesson: lesson!,
      practiceIndex: 0,
      practiceType: 'context-clue',
      mode: 'reference',
      referenceExerciseType: 'context-clue',
    })

    expect(resolved).not.toBeNull()
    expect(resolved!.sourceStepNumber).toBe(3)
    expect(resolved!.exercise.correctAnswer).toBe('drink')
  })

  it('maps free-response to lesson steps 4/6', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const even = resolveReferenceLessonStep({
      lesson: lesson!,
      referenceExerciseType: 'free-response',
      stepIndex: 0,
    })
    const odd = resolveReferenceLessonStep({
      lesson: lesson!,
      referenceExerciseType: 'free-response',
      stepIndex: 1,
    })

    expect(even?.sourceStepNumber).toBe(4)
    expect(odd?.sourceStepNumber).toBe(6)
  })
})
