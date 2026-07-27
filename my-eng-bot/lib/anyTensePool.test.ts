import { describe, expect, it } from 'vitest'
import {
  ANY_CORE5,
  isAnyCoreExhausted,
  pickAnyTenseForTurn,
  resolveAnyCorePool,
  resolveAnyTensePool,
  resolveConcreteCefrPool,
  sanitizeUsedAnyTenses,
  validateAnyDrillAxis,
  withAnyTenseMenuOption,
} from './anyTensePool'

describe('ANY_CORE5', () => {
  it('содержит 5 разговорных времён включая Present Perfect', () => {
    expect(ANY_CORE5).toEqual([
      'present_simple',
      'present_continuous',
      'past_simple',
      'future_simple',
      'present_perfect',
    ])
  })
})

describe('resolveConcreteCefrPool / resolveAnyCorePool', () => {
  it('A1 adult: PS+PC, без all и без PP', () => {
    expect(resolveConcreteCefrPool('a1', 'adult').sort()).toEqual(
      ['present_continuous', 'present_simple'].sort()
    )
    expect(resolveAnyCorePool('a1', 'adult').sort()).toEqual(
      ['present_continuous', 'present_simple'].sort()
    )
  })

  it('A2: без Present Perfect', () => {
    const core = resolveAnyCorePool('a2', 'adult')
    expect(core).toContain('past_simple')
    expect(core).toContain('future_simple')
    expect(core).not.toContain('present_perfect')
  })

  it('B1: все 5 core', () => {
    expect(resolveAnyCorePool('b1', 'adult').sort()).toEqual([...ANY_CORE5].sort())
  })

  it('child A1: только CHILD ∩ CEFR', () => {
    const pool = resolveConcreteCefrPool('a1', 'child')
    expect(pool.every((t) => t === 'present_simple' || t === 'present_continuous')).toBe(true)
  })

  it('не содержит meta all', () => {
    expect(resolveConcreteCefrPool('all', 'adult')).not.toContain('all')
  })
})

describe('resolveAnyTensePool two-phase', () => {
  it('фаза core: unseen-first на B1', () => {
    const { candidates, phase } = resolveAnyTensePool({
      level: 'b1',
      audience: 'adult',
      usedTenses: ['present_simple', 'past_simple'],
    })
    expect(phase).toBe('core')
    expect(candidates).not.toContain('present_simple')
    expect(candidates).not.toContain('past_simple')
    expect(candidates).toContain('present_perfect')
    expect(candidates).not.toContain('past_continuous')
  })

  it('после exhaust core на B1 — full pool с continuous', () => {
    const used = [...ANY_CORE5]
    const { candidates, phase } = resolveAnyTensePool({
      level: 'b1',
      audience: 'adult',
      usedTenses: used,
    })
    expect(phase).toBe('full')
    expect(candidates).toContain('past_continuous')
    expect(candidates).toContain('future_continuous')
    expect(candidates).not.toContain('present_perfect_continuous')
  })

  it('C1 после exhaust допускает PPC', () => {
    const { candidates, phase } = resolveAnyTensePool({
      level: 'c1',
      audience: 'adult',
      usedTenses: [...ANY_CORE5],
    })
    expect(phase).toBe('full')
    expect(candidates).toContain('present_perfect_continuous')
    expect(candidates).toContain('future_perfect')
  })

  it('A1 после used PS+PC остаётся на тех же двух', () => {
    const { candidates, phase } = resolveAnyTensePool({
      level: 'a1',
      audience: 'adult',
      usedTenses: ['present_simple', 'present_continuous'],
    })
    expect(phase).toBe('full')
    expect(candidates.sort()).toEqual(['present_continuous', 'present_simple'].sort())
  })

  it('child после exhaust core не открывает Past Continuous', () => {
    const core = resolveAnyCorePool('b1', 'child')
    const { candidates } = resolveAnyTensePool({
      level: 'b1',
      audience: 'child',
      usedTenses: core,
    })
    expect(candidates).not.toContain('past_continuous')
  })
})

describe('pickAnyTenseForTurn unseen-first', () => {
  it('5 подряд pick на B1 с накоплением used → 5 разных из core', () => {
    const used: string[] = []
    const picked: string[] = []
    for (let i = 0; i < 5; i++) {
      const { tense, phase } = pickAnyTenseForTurn({
        level: 'b1',
        audience: 'adult',
        usedTenses: used,
        seed: `sim|${i}`,
        excludeTense: picked[picked.length - 1] ?? null,
      })
      expect(phase).toBe('core')
      expect(ANY_CORE5).toContain(tense)
      picked.push(tense)
      used.push(tense)
    }
    expect(new Set(picked).size).toBe(5)
  })

  it('A1 singleton exclude no-op безопасен', () => {
    const { tense } = pickAnyTenseForTurn({
      level: 'starter',
      audience: 'adult',
      usedTenses: [],
      seed: 's',
      excludeTense: 'present_simple',
    })
    expect(tense).toBe('present_simple')
  })
})

describe('withAnyTenseMenuOption', () => {
  it('всегда дописывает all первым', () => {
    expect(withAnyTenseMenuOption(['present_simple', 'present_continuous'])).toEqual([
      'all',
      'present_simple',
      'present_continuous',
    ])
  })

  it('не дублирует all из входа', () => {
    expect(withAnyTenseMenuOption(['all', 'present_simple'])[0]).toBe('all')
    expect(withAnyTenseMenuOption(['all', 'present_simple']).filter((t) => t === 'all')).toHaveLength(1)
  })
})

describe('sanitizeUsedAnyTenses', () => {
  it('dedupe, strip all/мусор, cap 12', () => {
    expect(
      sanitizeUsedAnyTenses([
        'all',
        'present_simple',
        'present_simple',
        'nope',
        'past_simple',
        1,
        null,
      ])
    ).toEqual(['present_simple', 'past_simple'])
  })
})

describe('validateAnyDrillAxis', () => {
  it('принимает валидный axis', () => {
    expect(
      validateAnyDrillAxis(
        { tense: 'past_simple', effectiveLevel: 'a2', effectiveSentenceType: 'negative' },
        { audience: 'adult', menuLevel: 'a2', menuSentenceType: 'negative' }
      )
    ).toEqual({
      tense: 'past_simple',
      effectiveLevel: 'a2',
      effectiveSentenceType: 'negative',
    })
  })

  it('отвергает all tense и mixed effective при menu mixed', () => {
    expect(
      validateAnyDrillAxis(
        { tense: 'all', effectiveLevel: 'a2', effectiveSentenceType: 'general' },
        { audience: 'adult', menuLevel: 'a2', menuSentenceType: 'mixed' }
      )
    ).toBeNull()
    expect(
      validateAnyDrillAxis(
        { tense: 'present_simple', effectiveLevel: 'a2', effectiveSentenceType: 'mixed' },
        { audience: 'adult', menuLevel: 'a2', menuSentenceType: 'mixed' }
      )
    ).toBeNull()
  })

  it('отвергает tense выше menu CEFR', () => {
    expect(
      validateAnyDrillAxis(
        { tense: 'present_perfect', effectiveLevel: 'b1', effectiveSentenceType: 'general' },
        { audience: 'adult', menuLevel: 'a2', menuSentenceType: 'general' }
      )
    ).toBeNull()
  })

  it('при menu level=all принимает concrete effective level', () => {
    expect(
      validateAnyDrillAxis(
        { tense: 'present_perfect', effectiveLevel: 'b1', effectiveSentenceType: 'general' },
        { audience: 'adult', menuLevel: 'all', menuSentenceType: 'mixed' }
      )
    ).not.toBeNull()
  })
})

describe('isAnyCoreExhausted', () => {
  it('true когда все core в used', () => {
    expect(isAnyCoreExhausted(['present_simple', 'present_continuous'], ['present_simple', 'present_continuous'])).toBe(
      true
    )
    expect(isAnyCoreExhausted(['present_simple', 'present_continuous'], ['present_simple'])).toBe(false)
  })
})
