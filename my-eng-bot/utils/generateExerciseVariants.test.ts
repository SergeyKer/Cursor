import { describe, expect, it } from 'vitest'
import { DEFAULT_ADAPTIVE_CONFIG, generateExerciseVariants, getNextVariant } from '@/utils/generateExerciseVariants'

describe('generateExerciseVariants', () => {
  it('builds canonical there-is-are variants', () => {
    const variants = generateExerciseVariants({
      topic: 'there-is-are',
      rule: 'is + singular, are + plural',
      baseExamples: [],
    })

    expect(variants).toHaveLength(3)
    expect(variants[0]?.difficulty).toBe('easy')
    expect(variants[1]?.correctAnswer).toBe('are')
    expect(variants[2]?.correctAnswer).toBe('is')
  })

  it('falls back to base examples for unknown topics', () => {
    const variants = generateExerciseVariants({
      topic: 'custom-topic',
      rule: 'Use the correct pattern',
      baseExamples: ['Example one', 'Example two'],
    })

    expect(variants).toHaveLength(2)
    expect(variants[0]?.question).toBe('Example one')
    expect(variants[1]?.difficulty).toBe('medium')
  })
})

describe('getNextVariant', () => {
  const variants = generateExerciseVariants({
    topic: 'there-is-are',
    rule: 'is + singular, are + plural',
    baseExamples: [],
  })

  it('advances to the next variant when there are no excessive errors', () => {
    expect(getNextVariant(variants, 0, 0, DEFAULT_ADAPTIVE_CONFIG)).toBe(1)
  })

  it('returns the easy variant when error threshold is reached', () => {
    expect(getNextVariant(variants, 2, 2, DEFAULT_ADAPTIVE_CONFIG)).toBe(0)
  })

  it('returns -1 after the final variant', () => {
    expect(getNextVariant(variants, 2, 0, DEFAULT_ADAPTIVE_CONFIG)).toBe(-1)
  })
})
