import { describe, expect, it } from 'vitest'
import { resolveExerciseForVariant } from '@/hooks/useLessonEngine'
import type { Exercise } from '@/types/lesson'

describe('resolveExerciseForVariant', () => {
  it('keeps a plain exercise unchanged when there are no variants', () => {
    const exercise: Exercise = {
      type: 'translate',
      question: 'Translate the sentence.',
      correctAnswer: 'Hello.',
      acceptedAnswers: ['Hello.'],
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
    }

    const resolved = resolveExerciseForVariant(exercise, 0)

    expect(resolved?.question).toBe('Translate the sentence.')
    expect(resolved?.correctAnswer).toBe('Hello.')
  })

  it('projects the active variant onto the effective exercise', () => {
    const exercise: Exercise = {
      type: 'fill_choice',
      question: 'Base question',
      correctAnswer: 'Base answer',
      acceptedAnswers: ['Base answer'],
      hint: 'Base hint',
      options: ['Base answer', 'Wrong 1', 'Wrong 2'],
      answerFormat: 'choice',
      answerPolicy: 'strict',
      variants: [
        {
          id: 'v1',
          question: 'Easy question',
          options: ['Easy answer', 'Easy wrong 1', 'Easy wrong 2'],
          correctAnswer: 'Easy answer',
          acceptedAnswers: ['Easy answer'],
          hint: 'Easy hint',
          difficulty: 'easy',
          answerFormat: 'choice',
          answerPolicy: 'strict',
        },
        {
          id: 'v2',
          question: 'Hard question',
          options: ['Hard answer', 'Hard wrong 1', 'Hard wrong 2'],
          correctAnswer: 'Hard answer',
          acceptedAnswers: ['Hard answer'],
          hint: 'Hard hint',
          difficulty: 'hard',
          answerFormat: 'choice',
          answerPolicy: 'strict',
        },
      ],
    }

    const resolved = resolveExerciseForVariant(exercise, 1)

    expect(resolved?.question).toBe('Hard question')
    expect(resolved?.options).toEqual(['Hard answer', 'Hard wrong 1', 'Hard wrong 2'])
    expect(resolved?.correctAnswer).toBe('Hard answer')
    expect(resolved?.hint).toBe('Hard hint')
    expect(resolved?.currentVariantIndex).toBe(1)
  })

  it('falls back to base exercise fields when variant omits optional fields', () => {
    const exercise: Exercise = {
      type: 'fill_choice',
      question: 'Base question',
      correctAnswer: 'Base answer',
      acceptedAnswers: ['Base answer'],
      hint: 'Base hint',
      options: ['Base answer', 'Wrong 1', 'Wrong 2'],
      answerFormat: 'choice',
      answerPolicy: 'strict',
      variants: [
        {
          id: 'v1',
          question: 'Variant question',
          correctAnswer: 'Variant answer',
          hint: 'Variant hint',
          difficulty: 'easy',
        },
      ],
    }

    const resolved = resolveExerciseForVariant(exercise, 0)

    expect(resolved?.question).toBe('Variant question')
    expect(resolved?.options).toEqual(['Base answer', 'Wrong 1', 'Wrong 2'])
    expect(resolved?.acceptedAnswers).toEqual(['Base answer'])
    expect(resolved?.hint).toBe('Variant hint')
    expect(resolved?.currentVariantIndex).toBe(0)
  })
})
