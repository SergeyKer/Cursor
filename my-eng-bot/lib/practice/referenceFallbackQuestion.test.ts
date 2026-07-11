import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import {
  buildReferenceFallbackQuestion,
  synthesizeReferenceFallbackPrompt,
} from '@/lib/practice/referenceFallbackQuestion'
import { isGapFillStylePrompt } from '@/lib/practice/prompt/dropdownFillPromptFormat'

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
    expect(second!.prompt).toMatch(/холодно/i)
    expect(second!.prompt).not.toBe(first!.prompt)
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

describe('buildReferenceFallbackQuestion listening-select', () => {
  it('builds seven unique listening-select fallbacks for lesson 1', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const seenKeys: string[] = []
    const recentPrompts: string[] = []
    const questions = []

    for (let stepIndex = 0; stepIndex < 7; stepIndex += 1) {
      const question = buildReferenceFallbackQuestion({
        lesson: lesson!,
        mode: 'reference',
        referenceExerciseType: 'listening-select',
        referenceStepIndex: stepIndex,
        referenceTotal: 7,
        recentPrompts,
        seenKeys,
      })
      expect(question).not.toBeNull()
      questions.push(question!)
      const fingerprint = buildPracticeQuestionFingerprintFromQuestion(question!)
      expect(fingerprint).toBeTruthy()
      expect(seenKeys).not.toContain(fingerprint)
      seenKeys.push(fingerprint!)
      recentPrompts.push(question!.prompt)
    }

    expect(questions).toHaveLength(7)
    expect(new Set(questions.map((item) => buildPracticeQuestionFingerprintFromQuestion(item))).size).toBe(7)
    expect(questions.every((item) => item.type === 'listening-select')).toBe(true)
    expect(questions.every((item) => !item.hint)).toBe(true)
  })
})

describe('buildReferenceFallbackQuestion dropdown-fill', () => {
  it('lesson 4 reference dropdown uses gap-fill prompt and country options', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).not.toBeNull()

    const question = buildReferenceFallbackQuestion({
      lesson: lesson!,
      mode: 'reference',
      referenceExerciseType: 'dropdown-fill',
      referenceStepIndex: 0,
      referenceTotal: 7,
    })

    expect(question).not.toBeNull()
    expect(question!.type).toBe('dropdown-fill')
    expect(question!.targetAnswer).toBe('Russia')
    expect(isGapFillStylePrompt(question!.prompt)).toBe(true)
    expect(question!.options?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(question!.options).toContain('Russia')
    expect(question!.options?.some((item) => ['a', 'an', 'the'].includes(item.toLowerCase()))).toBe(false)
  })

  it('lesson 3 reference dropdown uses single embedded-question frame', () => {
    const lesson = getStructuredLessonById('3')
    expect(lesson).not.toBeNull()

    const question = buildReferenceFallbackQuestion({
      lesson: lesson!,
      mode: 'reference',
      referenceExerciseType: 'dropdown-fill',
      referenceStepIndex: 0,
      referenceTotal: 7,
    })

    expect(question).not.toBeNull()
    expect(question!.type).toBe('dropdown-fill')
    expect(question!.targetAnswer).toBe('that')
    expect(isGapFillStylePrompt(question!.prompt)).toBe(true)
    expect(question!.prompt).toMatch(/I know ___ she likes tea/i)
    expect(question!.prompt).not.toMatch(/I am from/i)
    expect((question!.prompt.match(/___/g) ?? []).length).toBe(1)
  })
})
describe('buildReferenceFallbackQuestion context-clue', () => {
  it('aligns reference #3 fallback to lesson step 3 gap-fill words', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const question = buildReferenceFallbackQuestion({
      lesson: lesson!,
      mode: 'reference',
      referenceExerciseType: 'context-clue',
      referenceStepIndex: 0,
      referenceTotal: 7,
    })

    expect(question).not.toBeNull()
    expect(question!.targetAnswer).toBe('drink')
    expect(question!.options).toHaveLength(3)
    expect(question!.options?.every((item) => !/\s/.test(item.trim()) || item.split(/\s+/).length === 1)).toBe(true)
    expect(question!.options?.some((item) => /^It's /i.test(item))).toBe(false)
  })
})
