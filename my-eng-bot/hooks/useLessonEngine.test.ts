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
      type: 'translate',
      question: 'Base question',
      correctAnswer: 'Base answer',
      acceptedAnswers: ['Base answer'],
      hint: 'Base hint',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      variants: [
        {
          id: 'v1',
          question: 'Easy question',
          correctAnswer: 'Easy answer',
          acceptedAnswers: ['Easy answer'],
          hint: 'Easy hint',
          difficulty: 'easy',
          answerFormat: 'full_sentence',
          answerPolicy: 'strict',
        },
        {
          id: 'v2',
          question: 'Hard question',
          correctAnswer: 'Hard answer',
          acceptedAnswers: ['Hard answer'],
          hint: 'Hard hint',
          difficulty: 'hard',
          answerFormat: 'full_sentence',
          answerPolicy: 'strict',
        },
      ],
    }

    const resolved = resolveExerciseForVariant(exercise, 1)

    expect(resolved?.question).toBe('Hard question')
    expect(resolved?.correctAnswer).toBe('Hard answer')
    expect(resolved?.hint).toBe('Hard hint')
    expect(resolved?.currentVariantIndex).toBe(1)
  })
})
