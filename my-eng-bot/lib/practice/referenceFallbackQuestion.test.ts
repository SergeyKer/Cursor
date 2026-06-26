import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import {
  buildReferenceFallbackQuestion,
  synthesizeReferenceFallbackPrompt,
} from '@/lib/practice/referenceFallbackQuestion'

describe('buildReferenceFallbackQuestion', () => {
  it('returns a question with a different fingerprint when Q1 is already seen', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildReferenceFallbackQuestion({
      lesson: lesson!,
      mode: 'reference',
      referenceExerciseType: 'choice',
      referenceStepIndex: 1,
      referenceTotal: 7,
      recentPrompts: [],
      seenKeys: [],
    })
    expect(session).not.toBeNull()

    const first = buildReferenceFallbackQuestion({
      lesson: lesson!,
      mode: 'reference',
      referenceExerciseType: 'choice',
      referenceStepIndex: 0,
      referenceTotal: 7,
      recentPrompts: [],
      seenKeys: [],
    })
    expect(first).not.toBeNull()

    const seenKey = buildPracticeQuestionFingerprintFromQuestion(first!)
    const second = buildReferenceFallbackQuestion({
      lesson: lesson!,
      mode: 'reference',
      referenceExerciseType: 'choice',
      referenceStepIndex: 1,
      referenceTotal: 7,
      recentPrompts: [first!.prompt],
      seenKeys: [seenKey],
    })

    expect(second).not.toBeNull()
    const secondKey = buildPracticeQuestionFingerprintFromQuestion(second!)
    expect(secondKey).not.toBe(seenKey)
    expect(second!.prompt).toContain('Сценарий')
  })

  it('synthesizes unique prompts for repeated local reference content', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const base = buildReferenceFallbackQuestion({
      lesson: lesson!,
      mode: 'reference',
      referenceExerciseType: 'choice',
      referenceStepIndex: 0,
      referenceTotal: 7,
    })
    expect(base).not.toBeNull()

    const seenKey = buildPracticeQuestionFingerprintFromQuestion(base!)
    for (let stepIndex = 1; stepIndex < 7; stepIndex += 1) {
      const next = buildReferenceFallbackQuestion({
        lesson: lesson!,
        mode: 'reference',
        referenceExerciseType: 'choice',
        referenceStepIndex: stepIndex,
        referenceTotal: 7,
        seenKeys: [seenKey],
      })
      expect(next).not.toBeNull()
      expect(buildPracticeQuestionFingerprintFromQuestion(next!)).not.toBe(seenKey)
    }
  })
})

describe('synthesizeReferenceFallbackPrompt', () => {
  it('prefixes scenario number to the base prompt', () => {
    expect(synthesizeReferenceFallbackPrompt('Ситуация: вечер.', 2, 7)).toBe('Сценарий 3 из 7: Ситуация: вечер.')
  })
})

describe('buildReferenceFallbackQuestion voice-shadow', () => {
  it('builds a voice-shadow fallback when local reference session has no matching type', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const question = buildReferenceFallbackQuestion({
      lesson: lesson!,
      mode: 'reference',
      referenceExerciseType: 'voice-shadow',
      referenceStepIndex: 0,
      referenceTotal: 7,
    })

    expect(question).not.toBeNull()
    expect(question!.type).toBe('voice-shadow')
    expect(question!.audioText).toBeTruthy()
    expect(question!.hint).toBeUndefined()
    expect(question!.prompt).not.toContain(question!.targetAnswer)
  })
})
