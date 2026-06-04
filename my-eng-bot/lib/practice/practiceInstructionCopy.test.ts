import { describe, expect, it } from 'vitest'
import {
  buildPracticeBriefingBubbles,
  buildPracticeInstructionCopy,
  sessionHasChoiceQuestion,
} from '@/lib/practice/practiceInstructionCopy'
import type { PracticeSession } from '@/types/practice'

function baseSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'p1',
    lessonId: '1',
    topic: 'Это / Пора',
    level: 'A1',
    mode: 'reference',
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

describe('buildPracticeInstructionCopy', () => {
  it('shows Engvo AI brand line with microphone between name and tagline', () => {
    const copy = buildPracticeInstructionCopy({ session: baseSession(), audience: 'adult' })
    expect(copy.iconBetweenCaption).toEqual({ before: 'Engvo AI', after: 'English Voice' })
  })

  it('uses neutral variant for all modes', () => {
    for (const mode of ['relaxed', 'balanced', 'challenge', 'reference'] as const) {
      const copy = buildPracticeInstructionCopy({
        session: baseSession({ mode, questions: [{ ...baseSession().questions[0]!, type: 'choice' }] }),
        audience: 'adult',
      })
      expect(copy.variant).toBe('neutral')
    }
  })

  it('mentions voice after wrong choice for adult', () => {
    const copy = buildPracticeInstructionCopy({ session: baseSession(), audience: 'adult' })
    expect(copy.message).toMatch(/вслух/i)
    expect(copy.message).toMatch(/неверного выбора/i)
  })

  it('softens voice rule when no choice in session', () => {
    const copy = buildPracticeInstructionCopy({
      session: baseSession({
        questions: [{ ...baseSession().questions[0]!, type: 'dictation' }],
      }),
      audience: 'adult',
    })
    expect(copy.message).toMatch(/повторить фразу/i)
    expect(copy.message).not.toMatch(/неверного выбора/i)
  })

  it('uses child phrasing', () => {
    const copy = buildPracticeInstructionCopy({ session: baseSession(), audience: 'child' })
    expect(copy.message).toMatch(/скажи/i)
  })

  it('puts mode tempo in statsLine and keeps mindset short in secondary', () => {
    const copy = buildPracticeInstructionCopy({
      session: baseSession({ mode: 'relaxed' }),
      audience: 'adult',
    })
    expect(copy.statsLine).toMatch(/Практика Relaxed · 1 шаг · без спешки/)
    expect(copy.secondaryMessage).toBe(
      'Ошибки ведут к победам.\nНавык говорения — со временем и тренировками.'
    )
    expect(copy.secondaryMessage).not.toMatch(/Relaxed/i)
    expect(copy.secondaryMessage!.split('\n')).toHaveLength(2)
  })
})

describe('buildPracticeBriefingBubbles', () => {
  it('returns one intro bubble with topic context', () => {
    const bubbles = buildPracticeBriefingBubbles(baseSession(), 'adult')
    expect(bubbles).toHaveLength(1)
    expect(bubbles[0]?.type).toBe('positive')
    expect(bubbles[0]?.content).toMatch(/Это \/ Пора/)
  })
})

describe('sessionHasChoiceQuestion', () => {
  it('detects choice in questions', () => {
    expect(sessionHasChoiceQuestion(baseSession())).toBe(true)
    expect(
      sessionHasChoiceQuestion(
        baseSession({ questions: [{ ...baseSession().questions[0]!, type: 'free-response' }] })
      )
    ).toBe(false)
  })
})
