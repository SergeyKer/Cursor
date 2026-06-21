import { describe, expect, it } from 'vitest'
import { formatFooterDynamicLine, FOOTER_DYNAMIC_MAX_LENGTH } from '@/lib/footerVoice'
import {
  buildPracticeFooterDynamicText,
  isPracticeWrongLimitAdvance,
} from '@/lib/practice/practiceFooterCopy'
import { getPracticeFooterView } from '@/lib/practice/practiceFooter'
import type { PracticeSession } from '@/types/practice'

function baseSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'p1',
    lessonId: '1',
    topic: 'Это / Пора',
    level: 'A1',
    mode: 'relaxed',
    entrySource: 'menu',
    generationSource: 'local',
    source: { kind: 'static_lesson', lessonId: '1' },
    status: 'active',
    questions: [
      {
        id: 'q1',
        lessonId: '1',
        type: 'choice',
        prompt: 'Test',
        targetAnswer: 'A',
        acceptedAnswers: ['A'],
        xpBase: 5,
        difficulty: 1,
        tolerance: 'normalized',
      },
    ],
    currentIndex: 0,
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    startedAt: 1,
    version: 1,
    instructionAcknowledged: false,
    ...overrides,
  }
}

function expectFitsFooter(text: string): void {
  const shown = formatFooterDynamicLine(text)
  expect(shown).toBe(text)
  expect(shown.length).toBeLessThanOrEqual(FOOTER_DYNAMIC_MAX_LENGTH)
  expect(shown.endsWith('…')).toBe(false)
}

describe('buildPracticeFooterDynamicText', () => {
  it('guides choice correction with mic on first wrong attempt', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'child',
        wrongAttemptsOnCurrentQuestion: 1,
        questionType: 'choice',
        isWrongLimitAdvance: false,
      })
    ).toBe('Ничего страшного. Скажи в микрофон.')
  })

  it('guides choice correction with pencil on second wrong attempt for adult', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'adult',
        wrongAttemptsOnCurrentQuestion: 2,
        questionType: 'choice',
        isWrongLimitAdvance: false,
      })
    ).toBe('Попробуйте снова. Текст - карандаш.')
  })

  it('guides text correction for non-choice exercises', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'child',
        wrongAttemptsOnCurrentQuestion: 1,
        questionType: 'dictation',
        isWrongLimitAdvance: false,
      })
    ).toBe('Напиши правильный ответ.')
  })

  it('supports wrong-limit advance in feedback state', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'feedback',
        audience: 'adult',
        wrongAttemptsOnCurrentQuestion: 0,
        isWrongLimitAdvance: true,
      })
    ).toBe('Продолжаем. Закрепим на след. шаге.')
  })

  it('returns null for successful feedback state', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'feedback',
        audience: 'child',
        wrongAttemptsOnCurrentQuestion: 0,
        isWrongLimitAdvance: false,
      })
    ).toBeNull()
  })
})

describe('isPracticeWrongLimitAdvance', () => {
  it('detects auto-advance after wrong-attempt limit', () => {
    const session = baseSession({
      answers: [
        {
          questionId: 'q1',
          userAnswer: 'wrong',
          correctAnswer: 'A',
          isCorrect: false,
          corrected: false,
          feedbackTone: 'success',
          xpEarned: 0,
          responseTimeMs: 100,
          timestamp: 1,
        },
      ],
    })
    expect(isPracticeWrongLimitAdvance(session)).toBe(true)
  })

  it('does not treat a correct answer as wrong-limit advance', () => {
    const session = baseSession({
      answers: [
        {
          questionId: 'q1',
          userAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          corrected: false,
          feedbackTone: 'success',
          xpEarned: 5,
          responseTimeMs: 100,
          timestamp: 1,
        },
      ],
    })
    expect(isPracticeWrongLimitAdvance(session)).toBe(false)
  })
})

describe('getPracticeFooterView correction and feedback', () => {
  it('uses supportive correction copy for choice', () => {
    const { dynamicText } = getPracticeFooterView(baseSession(), 'correction', {
      audience: 'child',
      wrongAttemptsOnCurrentQuestion: 1,
      questionType: 'choice',
    })
    expect(dynamicText).toBe('Ничего страшного. Скажи в микрофон.')
    expectFitsFooter(dynamicText)
  })

  it('keeps success feedback copy when answer was correct', () => {
    const { dynamicText } = getPracticeFooterView(baseSession(), 'feedback', {
      audience: 'child',
      isWrongLimitAdvance: false,
    })
    expect(dynamicText).toBe('Ответ принят. Можно идти дальше.')
  })

  it('uses supportive copy after wrong-limit advance', () => {
    const { dynamicText } = getPracticeFooterView(baseSession(), 'feedback', {
      audience: 'child',
      isWrongLimitAdvance: true,
    })
    expect(dynamicText).toBe('Ничего страшного. Идём дальше.')
    expectFitsFooter(dynamicText)
  })
})
