import { describe, expect, it } from 'vitest'
import {
  collectTranslateExpectedAnswers,
  englishPhrasesCollideWithAnswers,
  extractEnglishExamplesFromInfo,
  extractQuotedEnglishPhrases,
  infoSupportCollidesWithTranslateAnswers,
} from '@/lib/lessonExampleAnswerCollision'

describe('lessonExampleAnswerCollision', () => {
  it('extracts sentences from Пример block', () => {
    expect(extractEnglishExamplesFromInfo('Пример: "I am from Japan. I am a nurse."')).toEqual([
      'I am from Japan.',
      'I am a nurse.',
    ])
  })

  it('detects I am / I’m equivalence between example and translate answer', () => {
    const phrases = extractEnglishExamplesFromInfo('Пример: "I am fine."')
    const answers = collectTranslateExpectedAnswers({
      correctAnswer: "I'm fine.",
      acceptedAnswers: ["I'm fine.", 'I am fine.'],
    })
    expect(englishPhrasesCollideWithAnswers(phrases, answers)).toBe(true)
  })

  it('does not flag different adjectives', () => {
    const phrases = extractEnglishExamplesFromInfo('Пример: "I am calm."')
    const answers = collectTranslateExpectedAnswers({
      correctAnswer: "I'm happy.",
      acceptedAnswers: ["I'm happy.", 'I am happy.'],
    })
    expect(englishPhrasesCollideWithAnswers(phrases, answers)).toBe(false)
  })

  it('checks all exercise variants', () => {
    expect(
      infoSupportCollidesWithTranslateAnswers('Пример: "I am fine."', {
        correctAnswer: "I'm happy.",
        acceptedAnswers: ["I'm happy."],
        variants: [
          {
            id: 'v1',
            question: 'Переведите',
            correctAnswer: "I'm fine.",
            hint: '',
            difficulty: 'easy',
          },
        ],
      })
    ).toBe(true)
  })

  it('extracts quoted English on step 6 style info', () => {
    expect(extractQuotedEnglishPhrases('Так говорят: I am a nurse, I am a pilot.')).toEqual([])
    expect(extractQuotedEnglishPhrases('Фраза "I am a teacher." в начале.')).toEqual(['I am a teacher.'])
  })
})
