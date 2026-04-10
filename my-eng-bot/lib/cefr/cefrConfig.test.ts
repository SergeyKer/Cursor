import { describe, expect, it } from 'vitest'
import { getAllCefrLevelConfigs, getCefrLevelConfig } from './cefrConfig'

describe('cefrConfig', () => {
  it('returns null for adaptive level', () => {
    expect(getCefrLevelConfig('all')).toBeNull()
  })

  it('loads a1 config with required fields', () => {
    const cfg = getCefrLevelConfig('a1')
    expect(cfg).not.toBeNull()
    expect(cfg?.allowedVocabulary.length).toBeGreaterThan(0)
    expect(cfg?.grammarKey.length).toBeGreaterThan(0)
    expect(cfg?.questionStyle.length).toBeGreaterThan(0)
    expect(cfg?.correctionPriority.length).toBeGreaterThan(0)
  })

  it('provides full map for supported levels', () => {
    const all = getAllCefrLevelConfigs()
    expect(Object.keys(all)).toEqual(['starter', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'])
    expect(all.b2.forbiddenOrStrictlyLimited.length).toBeGreaterThan(0)
  })
})

