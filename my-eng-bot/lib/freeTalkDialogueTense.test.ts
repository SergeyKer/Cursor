import { describe, expect, it } from 'vitest'
import {
  buildAdultFullTensePool,
  pickWeightedFreeTalkTense,
  stableHash32,
} from './freeTalkDialogueTense'

describe('stableHash32', () => {
  it('воспроизводим для одной и той же строки', () => {
    expect(stableHash32('a|b|c')).toBe(stableHash32('a|b|c'))
  })
})

describe('pickWeightedFreeTalkTense', () => {
  const all12 = buildAdultFullTensePool()

  it('детерминирован при фиксированном seed', () => {
    const a = pickWeightedFreeTalkTense({
      candidates: all12,
      seed: 'fixed-seed-1',
      excludeTense: null,
    })
    const b = pickWeightedFreeTalkTense({
      candidates: all12,
      seed: 'fixed-seed-1',
      excludeTense: null,
    })
    expect(a).toBe(b)
  })

  it('excludeTense исключает время, если есть альтернативы', () => {
    const only = pickWeightedFreeTalkTense({
      candidates: ['future_perfect', 'past_simple'],
      seed: 'x',
      excludeTense: 'future_perfect',
    })
    expect(only).toBe('past_simple')
  })

  it('если в пуле только одно время — возвращает его даже при exclude', () => {
    const only = pickWeightedFreeTalkTense({
      candidates: ['future_perfect'],
      seed: 'y',
      excludeTense: 'future_perfect',
    })
    expect(only).toBe('future_perfect')
  })

  it('пустой пул — дефолт present_simple', () => {
    expect(
      pickWeightedFreeTalkTense({
        candidates: [],
        seed: 'z',
        excludeTense: null,
      })
    ).toBe('present_simple')
  })

  it('распределение: present_simple встречается чаще future_perfect (много сэмплов)', () => {
    const n = 500
    let ps = 0
    let fp = 0
    for (let i = 0; i < n; i++) {
      const t = pickWeightedFreeTalkTense({
        candidates: all12,
        seed: `batch|${i}`,
        excludeTense: null,
      })
      if (t === 'present_simple') ps++
      if (t === 'future_perfect') fp++
    }
    expect(ps).toBeGreaterThan(fp)
  })
})

describe('buildAdultFullTensePool', () => {
  it('12 времён без all', () => {
    const p = buildAdultFullTensePool()
    expect(p).toHaveLength(12)
    expect(p).not.toContain('all')
  })
})
