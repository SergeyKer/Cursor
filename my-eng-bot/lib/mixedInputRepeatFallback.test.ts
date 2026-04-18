import { describe, expect, it } from 'vitest'
import { buildMixedInputRepeatFallback } from './mixedInputRepeatFallback'

describe('buildMixedInputRepeatFallback', () => {
  it('replaces blini and fixes triing for PPC', () => {
    const out = buildMixedInputRepeatFallback({
      userText: 'I have been triing блины',
      tense: 'present_perfect_continuous',
    })
    expect(out.toLowerCase()).toContain('trying')
    expect(out.toLowerCase()).not.toContain('triing')
    expect(out.toLowerCase()).toContain('blini')
    expect(out).toMatch(/^I have been/i)
  })

  it('fixes wisited when stripping is the only path', () => {
    const out = buildMixedInputRepeatFallback({
      userText: 'I wisited Москва',
      tense: 'past_simple',
    })
    expect(out.toLowerCase()).toContain('visited')
    expect(out.toLowerCase()).not.toContain('wisited')
  })
})
