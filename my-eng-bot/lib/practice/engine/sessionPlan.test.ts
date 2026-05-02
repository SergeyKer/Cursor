import { describe, expect, it } from 'vitest'
import { PRACTICE_EXERCISE_REGISTRY } from '@/lib/practice/registry'
import { PRACTICE_MODE_PLANS } from '@/lib/practice/engine/sessionPlan'

describe('PRACTICE_MODE_PLANS', () => {
  it('keeps mode lengths aligned with the format selector copy', () => {
    expect(PRACTICE_MODE_PLANS.relaxed.length).toBe(6)
    expect(PRACTICE_MODE_PLANS.balanced.length).toBe(9)
    expect(PRACTICE_MODE_PLANS.challenge.length).toBe(12)
  })

  it('covers every registered exercise type across practice modes', () => {
    const plannedTypes = new Set(Object.values(PRACTICE_MODE_PLANS).flatMap((plan) => plan.types))
    const registeredTypes = Object.keys(PRACTICE_EXERCISE_REGISTRY)

    expect([...plannedTypes].sort()).toEqual(registeredTypes.sort())
  })

  it('keeps challenge as the only mode with boss ending', () => {
    expect(PRACTICE_MODE_PLANS.relaxed.boss).toBe(false)
    expect(PRACTICE_MODE_PLANS.balanced.boss).toBe(false)
    expect(PRACTICE_MODE_PLANS.challenge.boss).toBe(true)
    expect(PRACTICE_MODE_PLANS.challenge.types.at(-1)).toBe('boss-challenge')
  })
})

