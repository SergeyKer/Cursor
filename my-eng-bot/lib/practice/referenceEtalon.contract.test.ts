import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import { buildReferenceFallbackQuestions } from '@/lib/practice/referenceFallbackQuestion'
import { isCompleteSentence } from '@/lib/practice/choiceOptionGranularity'
import { isDictationStylePrompt } from '@/lib/practice/prompt/dictationPromptFormat'
import { isTranslateStylePrompt } from '@/lib/practice/prompt/promptSourceUtils'
import { isGapFillStylePrompt } from '@/lib/practice/prompt/dropdownFillPromptFormat'
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
          expect(new Set(fingerprints).size).toBeGreaterThanOrEqual(
            referenceType === 'listening-select' ? 7 : 6
          )

          if (referenceType === 'dictation') {
            const uniquePrompts = new Set(questions.map((question) => question.prompt.trim().toLowerCase()))
            expect(uniquePrompts.size).toBeGreaterThanOrEqual(5)
          }

          if (referenceType === 'error-fix') {
            const uniqueSituations = new Set(
              questions.map((question) => {
                const match = /(?:Ситуация|Тема)\s*:\s*([^.]*)/iu.exec(question.prompt)
                return (match?.[1] ?? question.prompt).trim().toLowerCase()
              })
            )
            const uniqueTargets = new Set(
              questions.map((question) => question.targetAnswer.trim().toLowerCase())
            )
            expect(uniqueSituations.size).toBeGreaterThanOrEqual(4)
            expect(uniqueTargets.size).toBeGreaterThanOrEqual(3)
          }

          for (const question of questions) {
            expect(question.prompt).toMatch(/[А-Яа-яЁё]/)
            if (referenceType === 'free-response') {
              expect(isTranslateStylePrompt(question.prompt)).toBe(true)
            }
            if (referenceType === 'dropdown-fill') {
              expect(isGapFillStylePrompt(question.prompt)).toBe(true)
              expect((question.prompt.match(/___/g) ?? []).length).toBe(1)
              expect(question.options?.length ?? 0).toBeGreaterThanOrEqual(3)
              expect(question.options?.some((item) => ['a', 'an', 'the'].includes(item.toLowerCase()))).toBe(false)
            }
            if (referenceType === 'dictation') {
              expect(isDictationStylePrompt(question.prompt)).toBe(true)
              expect(isCompleteSentence(question.targetAnswer)).toBe(true)
              expect(question.audioText).toBe(question.targetAnswer)
              expect(question.hint).toBeFalsy()
              expect(question.prompt).not.toContain(question.targetAnswer)
            }
            if (referenceType === 'listening-select') {
              expect(question.audioText).toBeTruthy()
              expect(question.prompt).not.toContain(question.targetAnswer)
              expect(question.hint).toBeFalsy()
              expect(question.options?.length ?? 0).toBeGreaterThanOrEqual(3)
              expect(question.prompt).toMatch(/Ситуация:|Тема:/i)
              expect(question.prompt).not.toMatch(/Прослушайте/i)
            }
            if (referenceType === 'error-fix') {
              expect(question.prompt).toMatch(/Ситуация:|Тема:/i)
              expect(question.prompt).toMatch(/Исправьте:/i)
              expect(question.prompt).not.toContain(question.targetAnswer)
              expect(question.options).toBeUndefined()
              expect(question.hint).toBeFalsy()
              expect(question.audioText).toBeFalsy()
            }
            if (referenceType === 'boss-challenge') {
              expect(question.minWords).toBeGreaterThanOrEqual(5)
            }
            if (referenceType === 'roleplay-mini') {
              expect(question.prompt).toMatch(/Собеседник:\s*«[^»]+\?»/)
              expect(question.prompt).not.toMatch(/Собеседник:\s*«[^»]*[а-яё][^»]*»/iu)
              expect(question.minWords).toBe(2)
              expect(question.keywords?.length ?? 0).toBeGreaterThan(0)
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
    expect(even?.variantIndex).toBe(0)
    expect(resolveReferenceLessonStep({
      lesson: lesson!,
      referenceExerciseType: 'free-response',
      stepIndex: 2,
    })?.variantIndex).toBe(1)
  })
})
