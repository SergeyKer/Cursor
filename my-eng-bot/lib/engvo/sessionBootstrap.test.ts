import { describe, expect, it } from 'vitest'
import {
  buildEngvoSessionBootstrapSnapshot,
  isEngvoSessionBootstrapRedundantUpdate,
} from './sessionBootstrap'

const baseA = buildEngvoSessionBootstrapSnapshot({
  level: 'a1',
  audience: 'adult',
  topic: 'free_talk',
  voice: 'ara',
  speed: 1,
  provider: 'xai',
})

const baseB = buildEngvoSessionBootstrapSnapshot({
  ...baseA,
  level: 'b1',
})

describe('Engvo session bootstrap snapshot', () => {
  it('marks equal snapshots as redundant', () => {
    const copy = buildEngvoSessionBootstrapSnapshot(baseA)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, copy)).toBe(true)
    expect(isEngvoSessionBootstrapRedundantUpdate(null, copy)).toBe(false)
  })

  it('detects level/topic/audience/voice/speed/provider changes', () => {
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, level: 'b1' })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, topic: 'travel' })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, audience: 'child' })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, voice: 'rex' })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, speed: 0.85 })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, provider: 'openai' })).toBe(false)
  })

  it('A→B→A: after refresh to B, return to A is not redundant; after refresh to A, redundant again', () => {
    let bootstrap = baseA
    expect(isEngvoSessionBootstrapRedundantUpdate(bootstrap, baseA)).toBe(true)

    bootstrap = baseB
    expect(isEngvoSessionBootstrapRedundantUpdate(bootstrap, baseA)).toBe(false)

    bootstrap = baseA
    expect(isEngvoSessionBootstrapRedundantUpdate(bootstrap, baseA)).toBe(true)
  })
})
