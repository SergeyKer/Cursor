import { describe, expect, it } from 'vitest'
import { getPracticeFinalePrimaryAction } from '@/lib/practice/practiceFinaleCta'

describe('getPracticeFinalePrimaryAction challenge labels', () => {
  it('uses Челлендж for reference upgrade CTA', () => {
    const result = getPracticeFinalePrimaryAction({
      tier: 0,
      globalAmount: 0,
      ringCount: 0,
      mode: 'reference',
      gemsPending: false,
    })
    expect(result.label).toContain('Челлендж')
    expect(result.label).not.toContain('Challenge')
    expect(result.hint).toContain('Челлендж')
  })

  it('uses Челлендж for challenge repeat CTA', () => {
    const result = getPracticeFinalePrimaryAction({
      tier: 2,
      globalAmount: 10,
      ringCount: 5,
      mode: 'challenge',
      gemsPending: false,
    })
    expect(result.label).toBe('Повторить Челлендж')
  })

  it('uses Челлендж for balanced upgrade CTA', () => {
    const result = getPracticeFinalePrimaryAction({
      tier: 2,
      globalAmount: 10,
      ringCount: 5,
      mode: 'balanced',
      gemsPending: false,
    })
    expect(result.label).toBe('Челлендж на 12 заданий')
  })
})
