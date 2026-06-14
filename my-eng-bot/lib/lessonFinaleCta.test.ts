import { describe, expect, it } from 'vitest'
import { buildFinaleOptionHints, resolveFinalePrimaryAction } from '@/lib/lessonFinaleCta'

describe('resolveFinalePrimaryAction', () => {
  it('routes to practice when profile has gold', () => {
    expect(resolveFinalePrimaryAction({ runMedal: 'silver', profileMedal: 'gold' })).toBe(
      'independent_practice'
    )
  })

  it('routes to practice when this run is gold', () => {
    expect(resolveFinalePrimaryAction({ runMedal: 'gold', profileMedal: null })).toBe(
      'independent_practice'
    )
  })

  it('routes to repeat when gold is not unlocked', () => {
    expect(resolveFinalePrimaryAction({ runMedal: 'bronze', profileMedal: 'bronze' })).toBe(
      'repeat_variant'
    )
  })
})

describe('buildFinaleOptionHints', () => {
  it('omits repeat hint when chasing gold', () => {
    expect(
      buildFinaleOptionHints({
        runMedal: 'bronze',
        profileMedal: null,
        audience: 'child',
      }).repeat_variant
    ).toBeUndefined()
    expect(
      buildFinaleOptionHints({
        runMedal: 'bronze',
        profileMedal: null,
        audience: 'child',
      }).independent_practice
    ).toBe('Скоро')
  })

  it('omits button hints when gold is unlocked', () => {
    const hints = buildFinaleOptionHints({
      runMedal: 'gold',
      profileMedal: 'gold',
      audience: 'child',
    })
    expect(hints.repeat_variant).toBeUndefined()
    expect(hints.independent_practice).toBeUndefined()
  })
})
