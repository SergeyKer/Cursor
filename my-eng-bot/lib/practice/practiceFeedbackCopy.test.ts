import { describe, expect, it } from 'vitest'
import {
  buildBossPrimarySuccessFeedback,
  buildPracticeWrongAnswerFeedback,
  buildPracticeWrongLimitEncouragement,
} from '@/lib/practice/practiceFeedbackCopy'

describe('buildBossPrimarySuccessFeedback', () => {
  const target = "It's time to go."

  it('uses praise only for exact normalized match', () => {
    expect(
      buildBossPrimarySuccessFeedback({
        audience: 'adult',
        userAnswer: "It's time to go.",
        targetAnswer: target,
      })
    ).toBe('Засчитано. Хороший ответ.')
  })

  it('treats contractions as exact', () => {
    expect(
      buildBossPrimarySuccessFeedback({
        audience: 'adult',
        userAnswer: 'It is time to go.',
        targetAnswer: target,
      })
    ).toBe('Засчитано. Хороший ответ.')
  })

  it('shows etalon sample when soft-accepted answer differs', () => {
    expect(
      buildBossPrimarySuccessFeedback({
        audience: 'adult',
        userAnswer: "It's time to stydy",
        targetAnswer: target,
      })
    ).toBe(`Засчитано. Образец: ${target}`)
  })

  it('uses child copy with sample', () => {
    expect(
      buildBossPrimarySuccessFeedback({
        audience: 'child',
        userAnswer: "It's time to stydy",
        targetAnswer: target,
      })
    ).toBe(`Засчитано. Вот так правильно: ${target}`)
  })

  it('uses child praise for exact match', () => {
    expect(
      buildBossPrimarySuccessFeedback({
        audience: 'child',
        userAnswer: "It's time to go.",
        targetAnswer: target,
      })
    ).toBe('Засчитано. Молодец!')
  })

  it('treats acceptedAnswers match as exact without sample', () => {
    expect(
      buildBossPrimarySuccessFeedback({
        audience: 'adult',
        userAnswer: 'It is time to go home.',
        targetAnswer: "It's time to go.",
        acceptedAnswers: ['It is time to go home.'],
      })
    ).toBe('Засчитано. Хороший ответ.')
  })

  it('omits sample when targetAnswer is empty', () => {
    expect(
      buildBossPrimarySuccessFeedback({
        audience: 'adult',
        userAnswer: "It's time to stydy",
        targetAnswer: '   ',
      })
    ).toBe('Засчитано. Хороший ответ.')
  })
})

describe('buildPracticeWrongAnswerFeedback', () => {
  it('uses the same first-attempt copy for child and adult', () => {
    const expected = "Неверно. Правильно: It's dark."
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 1,
        audience: 'child',
      })
    ).toBe(expected)
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 1,
        audience: 'adult',
      })
    ).toBe(expected)
  })

  it('uses child phrasing on the second attempt', () => {
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 2,
        audience: 'child',
      })
    ).toBe("Неверно. Давай ещё раз: It's dark.")
  })

  it('uses adult phrasing on the second attempt', () => {
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 2,
        audience: 'adult',
      })
    ).toBe("Неверно. Попробуйте ещё раз: It's dark.")
  })

  it('defaults second attempt to adult phrasing', () => {
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 2,
      })
    ).toBe("Неверно. Попробуйте ещё раз: It's dark.")
  })

  it('trims the correct answer', () => {
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "  It's dark.  ",
        attemptNumber: 1,
      })
    ).toBe("Неверно. Правильно: It's dark.")
  })
})

describe('buildPracticeWrongLimitEncouragement', () => {
  it('mentions the correct answer and third-attempt context for adults', () => {
    const message = buildPracticeWrongLimitEncouragement({
      correctAnswer: 'sleep',
      audience: 'adult',
      seed: 'q1|2|sleep',
    })
    expect(message).toContain('sleep')
    expect(message).toMatch(/трет|три|снова|паттерн|следующ/i)
  })

  it('uses child phrasing when audience is child', () => {
    const message = buildPracticeWrongLimitEncouragement({
      correctAnswer: 'sleep',
      audience: 'child',
      seed: 'q1|2|sleep',
    })
    expect(message).toContain('sleep')
    expect(message).not.toMatch(/Попробуйте/)
  })

  it('picks deterministically from the pool by seed', () => {
    const first = buildPracticeWrongLimitEncouragement({
      correctAnswer: 'go',
      audience: 'adult',
      seed: 'stable-seed',
    })
    const second = buildPracticeWrongLimitEncouragement({
      correctAnswer: 'go',
      audience: 'adult',
      seed: 'stable-seed',
    })
    expect(first).toBe(second)
  })

  it('trims the correct answer', () => {
    const message = buildPracticeWrongLimitEncouragement({
      correctAnswer: '  sleep  ',
      audience: 'adult',
      seed: 'trim-seed',
    })
    expect(message).toContain('sleep')
    expect(message).not.toContain('  sleep  ')
  })
})
