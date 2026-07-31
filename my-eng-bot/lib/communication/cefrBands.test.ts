import { describe, expect, it } from 'vitest'
import {
  buildCommunicationARuWarn,
  buildCommunicationBandReinforcement,
  buildCommunicationCPeerRule,
  isCommunicationALevelForRuWarn,
  resolveCommunicationCefrBand,
} from './cefrBands'

describe('resolveCommunicationCefrBand', () => {
  it('maps starter/a1 to a1 and keeps higher levels', () => {
    expect(resolveCommunicationCefrBand('starter')).toBe('a1')
    expect(resolveCommunicationCefrBand('a1')).toBe('a1')
    expect(resolveCommunicationCefrBand('a2')).toBe('a2')
    expect(resolveCommunicationCefrBand('b2')).toBe('b2')
    expect(resolveCommunicationCefrBand('c1')).toBe('c1')
    expect(resolveCommunicationCefrBand('all')).toBe('adaptive')
  })
})

describe('isCommunicationALevelForRuWarn', () => {
  it('is true only for fixed A levels', () => {
    expect(isCommunicationALevelForRuWarn('a1')).toBe(true)
    expect(isCommunicationALevelForRuWarn('all')).toBe(false)
    expect(isCommunicationALevelForRuWarn('b1')).toBe(false)
  })
})

describe('buildCommunicationBandReinforcement', () => {
  it('includes A1 scaffold and CEFR Future acquaintance, not a Future ban', () => {
    const text = buildCommunicationBandReinforcement('a1', 'child')
    expect(text).toMatch(/A1/i)
    expect(text).toMatch(/Future Simple/i)
    expect(text).not.toMatch(/Future ban|no Future|forbid Future/i)
  })

  it('C1 peer rule rejects teach-down', () => {
    const peer = buildCommunicationCPeerRule('c1')
    expect(peer).toMatch(/peer/i)
    expect(peer).toMatch(/teach-down|B2/i)
    expect(buildCommunicationBandReinforcement('c1', 'adult')).toContain(peer.slice(0, 40))
  })
})

describe('buildCommunicationARuWarn', () => {
  it('returns Russian meta for child and adult', () => {
    expect(buildCommunicationARuWarn('child')).toMatch(/по-английски/)
    expect(buildCommunicationARuWarn('adult')).toMatch(/по-английски/)
  })
})
