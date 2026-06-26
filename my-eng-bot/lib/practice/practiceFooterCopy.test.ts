import { describe, expect, it } from 'vitest'
import { formatFooterDynamicLine, FOOTER_DYNAMIC_MAX_LENGTH } from '@/lib/footerVoice'
import {
  buildPracticeCorrectionChipsFooterHint,
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

describe('buildPracticeCorrectionChipsFooterHint', () => {
  it('guides chips phase for adult and child', () => {
    expect(buildPracticeCorrectionChipsFooterHint('adult')).toBe(
      'После неверного выбора закрепите правильную фразу вслух.'
    )
    expect(buildPracticeCorrectionChipsFooterHint('child')).toBe(
      'Если выбрал неверно — скажи правильную фразу вслух.'
    )
  })
})

describe('buildPracticeFooterDynamicText', () => {
  it('shows chips hint during chips phase', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'adult',
        wrongAttemptsOnCurrentQuestion: 1,
        questionType: 'choice',
        isWrongLimitAdvance: false,
        correctionPhase: 'chips',
      })
    ).toBe('После неверного выбора закрепите правильную фразу вслух.')
  })

  it('shows mic footer on voiceReady', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'adult',
        wrongAttemptsOnCurrentQuestion: 1,
        questionType: 'choice',
        isWrongLimitAdvance: false,
        correctionPhase: 'voiceReady',
      })
    ).toBe('Скажите фразу вслух в микрофон.')
  })
  it('guides choice correction with pencil on second wrong attempt for adult', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'adult',
        wrongAttemptsOnCurrentQuestion: 2,
        questionType: 'choice',
        isWrongLimitAdvance: false,
        correctionPhase: 'voiceReady',
      })
    ).toBe('Попробуйте снова. Текст - карандаш.')
  })

  it('shows mic footer on voiceReady for voice-shadow correction', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'adult',
        wrongAttemptsOnCurrentQuestion: 1,
        questionType: 'voice-shadow',
        isWrongLimitAdvance: false,
        correctionPhase: 'voiceReady',
      })
    ).toBe('Скажите фразу вслух в микрофон.')
  })

  it('returns null footer during voice-shadow voiceLocked pause', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'adult',
        wrongAttemptsOnCurrentQuestion: 1,
        questionType: 'voice-shadow',
        isWrongLimitAdvance: false,
        correctionPhase: 'voiceLocked',
      })
    ).toBeNull()
  })

  it('guides voice-repeat correction instead of plain textarea for dictation', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'child',
        wrongAttemptsOnCurrentQuestion: 1,
        questionType: 'dictation',
        isWrongLimitAdvance: false,
        correctionPhase: 'voiceReady',
      })
    ).toBe('Ничего страшного. Скажи в микрофон.')
  })

  it('shows chips hint for listening-select during chips phase', () => {
    expect(
      buildPracticeFooterDynamicText({
        state: 'correction',
        audience: 'adult',
        wrongAttemptsOnCurrentQuestion: 1,
        questionType: 'listening-select',
        isWrongLimitAdvance: false,
        correctionPhase: 'chips',
      })
    ).toBe('После неверного выбора закрепите правильную фразу вслух.')
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
      correctionPhase: 'voiceReady',
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
