import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { normalizeAiPracticeQuestion } from '@/lib/practice/normalizeAiPracticeQuestion'
import { isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'

describe('normalizeAiPracticeQuestion', () => {
  it('fills choice-like options when the model returns too few', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'choice',
      prompt: 'Pick one.',
      targetAnswer: 'Hello.',
      acceptedAnswers: [],
      options: ['Hello.'],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 0)
    expect(q).not.toBeNull()
    expect(q!.options?.length).toBeGreaterThanOrEqual(2)
    expect(q!.options).toContain('Hello.')
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
