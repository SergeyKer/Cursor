import { describe, expect, it } from 'vitest'
import { validateAnswer } from '@/utils/validateAnswer'
import type { Exercise } from '@/types/lesson'

describe('validateAnswer', () => {
  it('matches choice answers strictly', () => {
    const exercise: Exercise = {
      type: 'fill_choice',
      question: 'Pick one',
      options: ['likes', 'like', 'liking'],
      correctAnswer: 'likes',
      answerFormat: 'choice',
    }

    expect(validateAnswer('likes', exercise)).toBe(true)
    expect(validateAnswer('like', exercise)).toBe(false)
  })

  it('matches equivalent sentence answers after normalization', () => {
    const exercise: Exercise = {
      type: 'translate',
      question: 'Translate',
      correctAnswer: "It's time to go home.",
      acceptedAnswers: ['It is time to go home.'],
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
    }

    expect(validateAnswer('It is time to go home!', exercise)).toBe(true)
  })

  it('matches single-word translate answers', () => {
    const exercise: Exercise = {
      type: 'translate',
      question: 'Fill one word',
      correctAnswer: 'Who',
      acceptedAnswers: ['who'],
      answerFormat: 'single_word',
      answerPolicy: 'strict',
    }

    expect(validateAnswer('who', exercise)).toBe(true)
    expect(validateAnswer('who likes', exercise)).toBe(false)
  })

  it('keeps strict policy narrow for contractions', () => {
    const exercise: Exercise = {
      type: 'translate',
      question: 'Translate',
      correctAnswer: "It's dark.",
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
    }

    expect(validateAnswer("It's dark.", exercise)).toBe(true)
    expect(validateAnswer('It is dark.', exercise)).toBe(false)
  })

  it('accepts explicit equivalent variants when policy allows it', () => {
    const exercise: Exercise = {
      type: 'translate',
      question: 'Translate',
      correctAnswer: 'Who likes tea? My brother likes tea.',
      acceptedAnswers: ['Who likes tea? My brother really likes tea.'],
      answerFormat: 'full_sentence',
      answerPolicy: 'equivalent_variants',
    }

    expect(validateAnswer('Who likes tea? My brother really likes tea.', exercise)).toBe(true)
  })
})
