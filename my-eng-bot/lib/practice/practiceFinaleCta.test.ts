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

  it('uses a near-miss retry CTA at 10/12', () => {
    const result = getPracticeFinalePrimaryAction({
      tier: 2,
      globalAmount: 32,
      ringCount: 2,
      mode: 'challenge',
      gemsPending: false,
      masteryScore: 10,
      plannedLength: 12,
    })
    expect(result.action).toBe('repeat')
    expect(result.label).toBe('Ещё один Челлендж')
    expect(result.hint).toContain('ещё одна с первой попытки')
  })
})
