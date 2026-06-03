import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { normalizeAiPracticeQuestion } from '@/lib/practice/normalizeAiPracticeQuestion'
import { isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'

describe('normalizeAiPracticeQuestion', () => {
  it('restores choice-like options from the lesson when the model omits them', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const sourceStep = lesson!.steps.find(
      (step) => step.exercise && Array.isArray(step.exercise.options) && step.exercise.options.length >= 2
    )
    expect(sourceStep?.exercise).toBeTruthy()
    const row = {
      type: 'choice',
      prompt: 'Pick one.',
      targetAnswer: sourceStep!.exercise!.correctAnswer,
      acceptedAnswers: [],
      options: [sourceStep!.exercise!.correctAnswer],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 0)
    expect(q).not.toBeNull()
    expect(q!.options?.length).toBeGreaterThanOrEqual(3)
    expect(q!.options).toEqual(sourceStep!.exercise!.options)
    expect(q!.prompt).toMatch(/Ситуация:|Тема:/i)
    expect(q!.prompt).not.toMatch(/^Pick one\./i)
  })

  it('falls back to generated options when lesson and model omit enough choices', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'choice',
      prompt: 'Pick one.',
      targetAnswer: 'It is dark.',
      acceptedAnswers: [],
      options: ['It is dark.'],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 99)
    expect(q).not.toBeNull()
    expect(q!.options?.length).toBeGreaterThanOrEqual(3)
    expect(q!.options).toContain('It is dark.')
  })

  it('keeps short options undefined for non-choice types', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'free-response',
      prompt: 'Say something.',
      targetAnswer: 'I agree.',
      options: ['only'],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 0)
    expect(q).not.toBeNull()
    expect(q!.options).toBeUndefined()
  })
})

describe('isChoiceLikePracticeType', () => {
  it('marks listening-select as choice-like', () => {
    expect(isChoiceLikePracticeType('listening-select')).toBe(true)
  })
})
