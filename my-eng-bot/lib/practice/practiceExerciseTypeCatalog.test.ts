import { describe, expect, it } from 'vitest'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import { PRACTICE_EXERCISE_TYPES_CATALOG_ORDER } from '@/lib/practice/practiceExerciseTypeCatalog'
import { REFERENCE_EXERCISE_OPTIONS } from '@/lib/practice/referenceExerciseOptions'

describe('practiceExerciseTypeCatalog', () => {
  it('keeps stable code catalog order 1-12 by type id', () => {
    expect(PRACTICE_EXERCISE_TYPES_CATALOG_ORDER[0]).toBe('choice')
    expect(PRACTICE_EXERCISE_TYPES_CATALOG_ORDER[11]).toBe('context-clue')
    expect(PRACTICE_EXERCISE_TYPES_CATALOG_ORDER).toHaveLength(12)
  })
})

describe('referenceExerciseOptions', () => {
  it('lists etalon UI in challenge step order with matching numbers', () => {
    expect(REFERENCE_EXERCISE_OPTIONS).toHaveLength(12)
    REFERENCE_EXERCISE_OPTIONS.forEach((item, index) => {
      expect(item.challengeStep).toBe(index + 1)
      expect(item.id).toBe(CHALLENGE_STEP_SPECS[index]?.type)
    })
    expect(REFERENCE_EXERCISE_OPTIONS[2]?.id).toBe('context-clue')
    expect(REFERENCE_EXERCISE_OPTIONS[2]?.challengeStep).toBe(3)
  })
})
