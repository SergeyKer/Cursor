import { describe, expect, it } from 'vitest'
import {
  CHALLENGE_STEP_SPECS,
  countWrongChoiceLikeBefore,
  getPracticeStepSpec,
  getPracticeStepSpecs,
  resolveEffectivePracticeStepSpec,
  resolveAdaptiveTierForStep,
  resolveTierForStep,
} from '@/lib/practice/engine/stepSpec'
import type { PracticeSession } from '@/types/practice'

function baseSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 's1',
    mode: 'challenge',
    topic: 'Test',
    status: 'active',
    currentIndex: 0,
    questions: CHALLENGE_STEP_SPECS.map((spec, index) => ({
      id: `q${index}`,
      type: spec.type,
      prompt: 'Test',
      targetAnswer: "It's cold.",
    })),
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    instructionAcknowledged: true,
    ...overrides,
  }
}

describe('stepSpec', () => {
  it('returns null for reference mode', () => {
    expect(getPracticeStepSpecs('reference')).toBeNull()
    expect(getPracticeStepSpec('reference', 0)).toBeNull()
  })

  it('defines challenge order with 12 unique catalog types', () => {
    expect(CHALLENGE_STEP_SPECS).toHaveLength(12)
    expect(new Set(CHALLENGE_STEP_SPECS.map((s) => s.type)).size).toBe(12)
    expect(CHALLENGE_STEP_SPECS[0]?.type).toBe('choice')
    expect(CHALLENGE_STEP_SPECS[1]?.type).toBe('voice-shadow')
    expect(CHALLENGE_STEP_SPECS.at(-1)?.type).toBe('boss-challenge')
  })

  it('caps balanced speed-round at semantic-near', () => {
    const spec = getPracticeStepSpec('balanced', 8)
    expect(spec?.type).toBe('speed-round')
    expect(resolveTierForStep('balanced', spec!)).toBe('semantic-near')
  })

  it('downgrades speed-round tier after choice-like errors', () => {
    const session = baseSession({
      answers: [
        {
          questionId: 'q0',
          userAnswer: 'x',
          isCorrect: false,
          corrected: false,
          correctAnswer: "It's cold.",
          xpEarned: 0,
          timestamp: 1,
        },
      ],
    })
    const effective = resolveEffectivePracticeStepSpec(session, 10)
    expect(effective?.type).toBe('speed-round')
    expect(effective?.distractorTier).toBe('semantic-near')
  })

  it('exports countWrongChoiceLikeBefore for distractor-tier steps only', () => {
    const session = baseSession({
      answers: [
        {
          questionId: 'q1',
          userAnswer: 'x',
          isCorrect: false,
          corrected: false,
          correctAnswer: 'repeat',
          xpEarned: 0,
          timestamp: 1,
        },
        {
          questionId: 'q0',
          userAnswer: 'y',
          isCorrect: false,
          corrected: false,
          correctAnswer: "It's cold.",
          xpEarned: 0,
          timestamp: 2,
        },
      ],
    })
    expect(countWrongChoiceLikeBefore(session, 10)).toBe(1)
    expect(resolveAdaptiveTierForStep('challenge', 10, 1)).toBe('semantic-near')
    expect(resolveAdaptiveTierForStep('challenge', 10, 0)).toBe('minimal-pair')
  })
})