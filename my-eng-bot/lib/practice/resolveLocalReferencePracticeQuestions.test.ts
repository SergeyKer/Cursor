import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { PRACTICE_REFERENCE_COPY } from '@/lib/uiCopy/practiceCopy'
import { resolveLocalReferencePracticeQuestions } from '@/lib/practice/resolveLocalReferencePracticeQuestions'

describe('resolveLocalReferencePracticeQuestions', () => {
  it('requires referenceExerciseType', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const result = resolveLocalReferencePracticeQuestions({ lesson: lesson! })
    expect(result).toEqual({ error: PRACTICE_REFERENCE_COPY.selectExerciseType })
  })

  it('builds seven local reference questions for the selected type', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const result = resolveLocalReferencePracticeQuestions({
      lesson: lesson!,
      referenceExerciseType: 'choice',
    })

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.questions).toHaveLength(7)
    expect(result.questions.every((question) => question.type === 'choice')).toBe(true)
  })
})
