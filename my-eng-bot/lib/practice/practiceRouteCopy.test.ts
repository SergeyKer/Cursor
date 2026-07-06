import { describe, expect, it } from 'vitest'
import { buildPracticeFeedOpening, buildPracticeRouteStepCopy } from '@/lib/practice/practiceRouteCopy'
import type { PracticeSession } from '@/types/practice'

function session(mode: PracticeSession['mode']): PracticeSession {
  return {
    id: 's1',
    mode,
    topic: 'Тема',
    status: 'active',
    currentIndex: 0,
    questions: Array.from({ length: mode === 'challenge' ? 12 : 6 }, (_, i) => ({
      id: `q${i}`,
      type: 'choice' as const,
      prompt: 'Ситуация: test',
      targetAnswer: 'A',
    })),
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    instructionAcknowledged: true,
  }
}

describe('practiceRouteCopy', () => {
  it('returns null for reference', () => {
    expect(
      buildPracticeRouteStepCopy({
        session: session('reference'),
        questionIndex: 0,
        audience: 'adult',
        previousWasCorrect: null,
      })
    ).toBeNull()
  })

  it('builds challenge route opening with step label', () => {
    const opening = buildPracticeFeedOpening({
      session: session('challenge'),
      questionIndex: 0,
      audience: 'adult',
      previousWasCorrect: null,
    })
    expect(opening).toContain('Шаг 1/12')
    expect(opening).toContain('Разогрев')
  })

  it('uses dictation opening on challenge index 7', () => {
    const challenge = session('challenge')
    const opening = buildPracticeFeedOpening({
      session: challenge,
      questionIndex: 7,
      audience: 'adult',
      previousWasCorrect: null,
    })
    expect(opening).toContain('фразу')
    expect(opening).toContain('прослушайте')
    expect(opening.length).toBeLessThan(120)
  })

  it('does not use dictation opening on challenge index 6', () => {
    const opening = buildPracticeFeedOpening({
      session: session('challenge'),
      questionIndex: 6,
      audience: 'adult',
      previousWasCorrect: null,
    })
    expect(opening).not.toContain('Без подсказок')
  })

  it('uses dictation opening on balanced index 7', () => {
    const opening = buildPracticeFeedOpening({
      session: session('balanced'),
      questionIndex: 7,
      audience: 'adult',
      previousWasCorrect: null,
    })
    expect(opening).toContain('фразу')
  })
})
