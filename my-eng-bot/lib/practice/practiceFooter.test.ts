import { describe, expect, it } from 'vitest'
import { formatFooterDynamicLine, FOOTER_DYNAMIC_MAX_LENGTH } from '@/lib/footerVoice'
import {
  getPracticeFooterView,
  practiceStatusLabel,
} from '@/lib/practice/practiceFooter'
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

describe('getPracticeFooterView briefing', () => {
  it('fits default footer dynamic line limit without ellipsis', () => {
    const { dynamicText } = getPracticeFooterView(baseSession(), 'briefing')
    const shown = formatFooterDynamicLine(dynamicText)
    expect(shown).toBe(dynamicText)
    expect(shown.length).toBeLessThanOrEqual(FOOTER_DYNAMIC_MAX_LENGTH)
    expect(shown.endsWith('…')).toBe(false)
  })

  it('shows empty meter progress at briefing', () => {
    const { sessionMeter } = getPracticeFooterView(
      baseSession({ mode: 'balanced', targetQuestionCount: 9 }),
      'briefing'
    )
    expect(sessionMeter.current).toBe(0)
    expect(sessionMeter.target).toBe(9)
    expect(sessionMeter.statusLabel).toBe('🎯9')
    expect(sessionMeter.fillPercent).toBe(0)
  })
})

describe('practiceStatusLabel', () => {
  it('returns finish, retry, and remaining glyphs', () => {
    expect(practiceStatusLabel({ state: 'completed', remaining: 0 })).toBe('🏁')
    expect(practiceStatusLabel({ state: 'correction', remaining: 3 })).toBe('🔁')
    expect(practiceStatusLabel({ state: 'idle', remaining: 5 })).toBe('🎯5')
  })
})

describe('getPracticeFooterView sessionMeter', () => {
  it.each([
    { mode: 'relaxed' as const, target: 6, answered: 2, expectRemaining: '🎯4' },
    { mode: 'balanced' as const, target: 9, answered: 3, expectRemaining: '🎯6' },
    { mode: 'challenge' as const, target: 12, answered: 5, expectRemaining: '🎯7' },
    { mode: 'reference' as const, target: 7, answered: 0, expectRemaining: '🎯7' },
  ])('tracks $mode length $target via answers.length', ({ mode, target, answered, expectRemaining }) => {
    const answers = Array.from({ length: answered }, (_, i) => ({
      questionId: `q${i}`,
      userAnswer: 'A',
      correctAnswer: 'A',
      isCorrect: true,
      corrected: false,
      xpEarned: 5,
      responseTimeMs: 100,
      timestamp: i + 1,
    }))
    const { sessionMeter } = getPracticeFooterView(
      baseSession({
        mode,
        targetQuestionCount: target,
        answers,
        xp: answered * 5,
        currentIndex: Math.min(answered, target - 1),
      }),
      'idle'
    )
    expect(sessionMeter.current).toBe(answered)
    expect(sessionMeter.target).toBe(target)
    expect(sessionMeter.sessionXp).toBe(answered * 5)
    expect(sessionMeter.statusLabel).toBe(expectRemaining)
  })

  it('shows retry glyph in correction and finish when completed', () => {
    const session = baseSession({
      mode: 'reference',
      targetQuestionCount: 7,
      answers: [
        {
          questionId: 'q1',
          userAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          corrected: false,
          xpEarned: 5,
          responseTimeMs: 100,
          timestamp: 1,
        },
      ],
    })
    expect(getPracticeFooterView(session, 'correction').sessionMeter.statusLabel).toBe('🔁')
    expect(getPracticeFooterView(session, 'completed').sessionMeter.statusLabel).toBe('🏁')
  })

  it('keeps legacy staticText empty so AppShell must not revive COMBO bottom line', () => {
    const { staticText } = getPracticeFooterView(
      baseSession({ targetQuestionCount: 7, mode: 'reference' }),
      'idle'
    )
    expect(staticText).toBe('')
  })
})
