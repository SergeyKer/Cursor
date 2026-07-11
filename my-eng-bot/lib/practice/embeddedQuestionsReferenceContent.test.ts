import { describe, expect, it } from 'vitest'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import { REFERENCE_EXERCISE_OPTIONS } from '@/lib/practice/referenceExerciseOptions'
import { buildReferenceFallbackQuestions } from '@/lib/practice/referenceFallbackQuestion'
import { EMBEDDED_QUESTIONS_CHALLENGE_ATOMS } from '@/lib/lessons/embeddedQuestionsChallengeAtoms'
import {
  embeddedScenarioRuEnAligned,
  isRecipeAnswerHint,
  situationRuIsTranslateLeak,
} from '@/lib/practice/embeddedQuestionScenarioAlignment'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { parseInterlocutorFromPrompt } from '@/lib/practice/prompt/roleplayPromptEngine'

describe('embedded questions reference content', () => {
  const lesson = getStructuredLessonById('3')
  expect(lesson).not.toBeNull()

  it('defines 7 reference scenarios per exercise type', () => {
    const pools = lesson!.repeatConfig?.referenceScenariosByType ?? {}
    for (const option of REFERENCE_EXERCISE_OPTIONS) {
      const pool = pools[option.id]
      expect(pool, option.id).toHaveLength(7)
      for (const scenario of pool ?? []) {
        expect(isRecipeAnswerHint(scenario.hint)).toBe(false)
        expect(
          situationRuIsTranslateLeak(scenario.situationRu, scenario.targetAnswer, option.id)
        ).toBe(false)
      }
    }
  })

  it('anchors reference scenario #1 to challenge atom for each type', () => {
    const pools = lesson!.repeatConfig?.referenceScenariosByType ?? {}
    for (const [index, spec] of CHALLENGE_STEP_SPECS.entries()) {
      const atom = EMBEDDED_QUESTIONS_CHALLENGE_ATOMS[index]!
      const first = pools[spec.type]?.[0]
      expect(first?.situationRu).toBe(atom.situationRu)
      expect(first?.targetAnswer).toBe(atom.targetAnswer)
    }
  })

  it('builds 7 aligned reference questions for choice and roleplay', () => {
    for (const referenceType of ['choice', 'roleplay-mini', 'error-fix'] as const) {
      const questions = buildReferenceFallbackQuestions({
        lesson: lesson!,
        referenceExerciseType: referenceType,
        referenceTotal: 7,
      })

      expect(questions).toHaveLength(7)
      expect(questions.every((question) => question.type === referenceType)).toBe(true)

      for (const question of questions) {
        expect(question.prompt).not.toMatch(/^Сценарий \d+ из 7:/i)
        expect(isRecipeAnswerHint(question.hint)).toBe(false)
        const situationMatch = /(?:Ситуация|Тема)\s*:\s*([^.]*)/iu.exec(question.prompt)
        const situationRu = situationMatch?.[1] ?? ''
        if (situationRu) {
          expect(embeddedScenarioRuEnAligned(situationRu, question.targetAnswer)).toBe(true)
          expect(
            situationRuIsTranslateLeak(situationRu, question.targetAnswer, referenceType)
          ).toBe(false)
        }
        if (referenceType === 'roleplay-mini') {
          const interlocutor = parseInterlocutorFromPrompt(question.prompt)
          expect(interlocutor).toMatch(/Do you know|Can you tell me/i)
          expect(interlocutor).not.toMatch(/Where does/i)
        }
      }
    }
  })
})
