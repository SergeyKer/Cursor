import { describe, expect, it } from 'vitest'
import {
  getBossPatternHint,
  resolveBossActionFrame,
  validateBossChallengeAnswer,
} from '@/lib/practice/bossChallengeAnswerValidation'
import { validatePracticeAnswer } from '@/lib/practice/practiceValidation'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { LessonData } from '@/types/lesson'
import type { PracticeQuestion } from '@/types/practice'

function bossQuestion(overrides: Partial<PracticeQuestion> = {}): PracticeQuestion {
  return {
    id: 'boss-1',
    lessonId: '1',
    type: 'boss-challenge',
    prompt: 'Ситуация: Пора спать. Напишите по-английски, что пора сделать.',
    targetAnswer: "It's time to go home.",
    acceptedAnswers: ["It's time to go home."],
    keywords: ['time to'],
    minWords: 4,
    xpBase: 15,
    difficulty: 5,
    tolerance: 'soft',
    ...overrides,
  }
}

describe('validateBossChallengeAnswer', () => {
  it('accepts short A1 time-to answers and soft typos', () => {
    const lesson = getStructuredLessonById('1')!
    const question = bossQuestion()
    expect(validateBossChallengeAnswer("It's time to go.", question, lesson)).toBe(true)
    expect(validateBossChallengeAnswer('Its time to sleep noww', question, lesson)).toBe(true)
    expect(validateBossChallengeAnswer('Time to sleep now please', question, lesson)).toBe(true)
  })

  it('rejects broken time-to pattern', () => {
    const lesson = getStructuredLessonById('1')!
    const question = bossQuestion()
    expect(validateBossChallengeAnswer("It's time to goes home", question, lesson)).toBe(false)
    expect(validateBossChallengeAnswer('I want sleep now please', question, lesson)).toBe(false)
  })

  it('accepts i-am pattern with typos on lesson 4', () => {
    const lesson = getStructuredLessonById('4')!
    const question = bossQuestion({
      lessonId: '4',
      targetAnswer: 'I am a student.',
      acceptedAnswers: ['I am a student.'],
      keywords: ['i am'],
    })
    expect(validateBossChallengeAnswer('I am a very god studend', question, lesson)).toBe(true)
  })

  it('uses blueprint mustInclude for unknown lessons', () => {
    const lesson = {
      id: '99',
      topic: 'Future plans',
      repeatConfig: {
        stepBlueprints: [
          {
            stepNumber: 6,
            semanticExpectations: { mustInclude: ['going to'] },
          },
        ],
      },
    } as LessonData
    const question = bossQuestion({
      lessonId: '99',
      targetAnswer: 'I am going to travel.',
      acceptedAnswers: ['I am going to travel.'],
      keywords: ['going to'],
    })
    expect(validateBossChallengeAnswer('I am going to sleep soon', question, lesson)).toBe(true)
    expect(validateBossChallengeAnswer('I will sleep soon tonight', question, lesson)).toBe(false)
  })
})

describe('boss dual-mode validation', () => {
  it('accepts pattern-soft on primary and requires etalon on correction', () => {
    const question = bossQuestion()
    expect(validatePracticeAnswer('Its time to sleep noww', question, 'typed')).toBe(true)
    expect(validatePracticeAnswer('Its time to sleep noww', question, 'correction')).toBe(false)
    expect(validatePracticeAnswer("It's time to go home.", question, 'correction')).toBe(true)
  })
})

describe('boss copy helpers', () => {
  it('returns pattern hint and action frame for lesson 1', () => {
    const lesson = getStructuredLessonById('1')!
    expect(getBossPatternHint({ lesson, targetAnswer: "It's time to go home." })).toMatch(
      /It's time to \+ глагол/
    )
    expect(resolveBossActionFrame({ lesson, targetAnswer: "It's time to go home." })).toMatch(
      /пора сделать/
    )
  })
})
