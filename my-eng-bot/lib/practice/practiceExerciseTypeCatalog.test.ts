import { describe, expect, it } from 'vitest'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import {
  getPracticeExerciseTypeCatalogNumber,
  PRACTICE_EXERCISE_TYPES_CATALOG_ORDER,
} from '@/lib/practice/practiceExerciseTypeCatalog'
import {
  getReferenceExerciseChallengeStep,
  REFERENCE_EXERCISE_OPTIONS,
} from '@/lib/practice/referenceExerciseOptions'

describe('practiceExerciseTypeCatalog', () => {
  it('matches challenge / etalon menu order 1-12', () => {
    expect(PRACTICE_EXERCISE_TYPES_CATALOG_ORDER).toHaveLength(12)
    expect(PRACTICE_EXERCISE_TYPES_CATALOG_ORDER).toEqual(CHALLENGE_STEP_SPECS.map((spec) => spec.type))
    expect(PRACTICE_EXERCISE_TYPES_CATALOG_ORDER[0]).toBe('choice')
    expect(PRACTICE_EXERCISE_TYPES_CATALOG_ORDER[1]).toBe('voice-shadow')
    expect(PRACTICE_EXERCISE_TYPES_CATALOG_ORDER[2]).toBe('context-clue')
    expect(PRACTICE_EXERCISE_TYPES_CATALOG_ORDER[11]).toBe('boss-challenge')
  })

  it('assigns the same numbers as etalon menu challengeStep', () => {
    for (const type of PRACTICE_EXERCISE_TYPES_CATALOG_ORDER) {
      expect(getPracticeExerciseTypeCatalogNumber(type)).toBe(getReferenceExerciseChallengeStep(type))
    }
  })
})

describe('referenceExerciseOptions', () => {
  it('lists etalon UI in challenge step order with matching numbers', () => {
    expect(REFERENCE_EXERCISE_OPTIONS).toHaveLength(12)
    REFERENCE_EXERCISE_OPTIONS.forEach((item, index) => {
      expect(item.challengeStep).toBe(index + 1)
      expect(item.id).toBe(CHALLENGE_STEP_SPECS[index]?.type)
      expect(getPracticeExerciseTypeCatalogNumber(item.id)).toBe(item.challengeStep)
    })
    expect(REFERENCE_EXERCISE_OPTIONS[2]?.id).toBe('context-clue')
    expect(REFERENCE_EXERCISE_OPTIONS[2]?.challengeStep).toBe(3)
  })
})
