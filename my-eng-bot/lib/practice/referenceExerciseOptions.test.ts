import { describe, expect, it } from 'vitest'
import { getReferenceExerciseChallengeStep, REFERENCE_EXERCISE_OPTIONS } from '@/lib/practice/referenceExerciseOptions'

describe('referenceExerciseOptions', () => {
  it('maps context-clue to challenge step 3', () => {
    expect(getReferenceExerciseChallengeStep('context-clue')).toBe(3)
    expect(getReferenceExerciseChallengeStep('dropdown-fill')).toBe(6)
    expect(getReferenceExerciseChallengeStep('boss-challenge')).toBe(12)
  })

  it('covers all 12 types once', () => {
    expect(new Set(REFERENCE_EXERCISE_OPTIONS.map((item) => item.id)).size).toBe(12)
  })
})
