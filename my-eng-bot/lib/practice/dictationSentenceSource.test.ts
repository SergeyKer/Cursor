import { describe, expect, it } from 'vitest'
import { isDictationSentenceSource } from '@/lib/practice/dictationSentenceSource'

describe('isDictationSentenceSource', () => {
  it('accepts translate full_sentence with complete answer', () => {
    expect(
      isDictationSentenceSource({
        type: 'translate',
        answerFormat: 'full_sentence',
        correctAnswer: "It's dark.",
        question: 'Переведите: "Темно"',
      })
    ).toBe(true)
  })

  it('rejects single_word translate', () => {
    expect(
      isDictationSentenceSource({
        type: 'translate',
        answerFormat: 'single_word',
        correctAnswer: 'dark',
        question: 'Переведите',
      })
    ).toBe(false)
  })

  it('rejects fill_text gap-fill', () => {
    expect(
      isDictationSentenceSource({
        type: 'fill_text',
        correctAnswer: 'dark',
        question: 'It is ___ outside.',
      })
    ).toBe(false)
  })

  it('rejects fill_choice one-word gap', () => {
    expect(
      isDictationSentenceSource({
        type: 'fill_choice',
        correctAnswer: 'dark',
        options: ['dark', 'cold', 'late'],
        question: 'It is ___ outside.',
      })
    ).toBe(false)
  })

  it('rejects short_phrase with two tokens', () => {
    expect(
      isDictationSentenceSource({
        type: 'translate',
        answerFormat: 'short_phrase',
        correctAnswer: 'go home',
        question: 'Переведите',
      })
    ).toBe(false)
  })
})
