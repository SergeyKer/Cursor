import { describe, expect, it } from 'vitest'
import {
  buildPracticeBriefingBubbles,
  buildPracticeInstructionCopy,
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
  it('uses stakes-only card without brand how-to or slogan', () => {
    const copy = buildPracticeInstructionCopy({ session: baseSession(), audience: 'adult' })
    expect(copy.variant).toBe('info')
    expect(copy.title).toBe('Как устроена практика')
    expect(copy.statsLine).toMatch(/^Эталон · \d+ шаг/)
    expect(copy.thesisLines).toEqual([])
  })

  it('uses child title and stats without tempo suffix', () => {
    const copy = buildPracticeInstructionCopy({
      session: baseSession({ mode: 'challenge' }),
      audience: 'child',
    })
    expect(copy.title).toBe('Коротко о правилах')
    expect(copy.statsLine).toBe('Челлендж · 12 шагов')
    expect(copy.statsLine).not.toMatch(/плотнее|4 раунда|средне|мягко/)
  })

  it('keeps adult stats without tempo suffix', () => {
    const copy = buildPracticeInstructionCopy({
      session: baseSession({ mode: 'relaxed' }),
      audience: 'adult',
    })
    expect(copy.statsLine).toBe('Лёгкая · 6 шагов')
    expect(copy.statsLine).not.toMatch(/без спешки|4 раунда/)
  })

  it('uses info variant for all modes', () => {
    for (const mode of ['relaxed', 'balanced', 'challenge', 'reference'] as const) {
      const copy = buildPracticeInstructionCopy({
        session: baseSession({ mode }),
        audience: 'adult',
      })
      expect(copy.variant).toBe('info')
    }
  })
})

describe('buildPracticeBriefingBubbles', () => {
  it('returns adult bubble with rules tone', () => {
    const bubbles = buildPracticeBriefingBubbles(baseSession(), 'adult')
    expect(bubbles).toHaveLength(1)
    expect(bubbles[0]?.content).toBe(
      'Эталон по теме «Это / Пора». Сначала — коротко о правилах.'
    )
  })

  it('returns child bubble focused on how to win', () => {
    const bubbles = buildPracticeBriefingBubbles(baseSession({ mode: 'challenge' }), 'child')
    expect(bubbles).toHaveLength(1)
    expect(bubbles[0]?.content).toBe(
      'Челлендж «Это / Пора». Сначала — коротко, как победить.'
    )
  })
})
