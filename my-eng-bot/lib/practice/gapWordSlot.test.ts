import { describe, expect, it } from 'vitest'
import {
  buildSlotAwareWordDistractors,
  inferGapWordSlot,
  isOptionCompatibleWithSlot,
  validateDropdownFillOptions,
} from '@/lib/practice/gapWordSlot'
import { resolveDropdownOptionCount } from '@/lib/practice/dropdownOptionCount'

describe('gapWordSlot', () => {
  it('infers country slot from from ___ frame', () => {
    expect(
      inferGapWordSlot({
        targetAnswer: 'Russia',
        prompt: 'Переведите: "Я из России." - "I am from ___."',
        sourcePattern: 'I am from + country',
      })
    ).toBe('country')
  })

  it('infers article slot for a/an/the', () => {
    expect(
      inferGapWordSlot({
        targetAnswer: 'an',
        prompt: 'I am ___ engineer.',
      })
    ).toBe('article')
  })

  it('rejects articles for country slot', () => {
    expect(isOptionCompatibleWithSlot('an', 'country', 'Russia')).toBe(false)
    expect(isOptionCompatibleWithSlot('Spain', 'country', 'Russia')).toBe(true)
  })

  it('builds 4 country distractors for challenge', () => {
    const options = buildSlotAwareWordDistractors({
      slot: 'country',
      targetAnswer: 'Russia',
      tier: 'semantic-near',
      targetCount: 4,
    })
    expect(options).toHaveLength(4)
    expect(options[0]).toBe('Russia')
    expect(options.every((item) => !['a', 'an', 'the'].includes(item.toLowerCase()))).toBe(true)
  })

  it('validates same-class dropdown options', () => {
    expect(
      validateDropdownFillOptions({
        options: ['Russia', 'Spain', 'France', 'Germany'],
        targetAnswer: 'Russia',
        prompt: 'I am from ___.',
        targetCount: 4,
      })
    ).toBe(true)
    expect(
      validateDropdownFillOptions({
        options: ['Russia', 'an', 'the'],
        targetAnswer: 'Russia',
        prompt: 'I am from ___.',
      })
    ).toBe(false)
  })
})

describe('dropdownOptionCount', () => {
  it('returns 3 for closed slots and relaxed open slots', () => {
    expect(resolveDropdownOptionCount({ slot: 'article', mode: 'challenge' })).toBe(3)
    expect(resolveDropdownOptionCount({ slot: 'country', mode: 'relaxed' })).toBe(3)
  })

  it('returns 4 for open lexical slots on challenge', () => {
    expect(resolveDropdownOptionCount({ slot: 'country', mode: 'challenge', tier: 'semantic-near' })).toBe(4)
  })
})
