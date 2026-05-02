import { describe, expect, it } from 'vitest'
import {
  buildMixedDialogueFallbackComment,
  buildMixedInputRepeatFallback,
  hasRussianDialogueFallbackSignal,
} from './mixedInputRepeatFallback'

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

  it('replaces Russian noun after like without adding infinitive advice', () => {
    const out = buildMixedInputRepeatFallback({
      userText: 'I like фара',
      tense: 'present_simple',
    })
    const comment = buildMixedDialogueFallbackComment({
      audience: 'adult',
      level: 'a2',
      userText: 'I like фара',
    })

    expect(out).toBe('I like the headlight.')
    expect(comment).toContain('фара = headlight')
    expect(comment).not.toContain('like + to')
    expect(comment).not.toContain('инфинитив')
  })

  it('builds an English repeat for a fully Russian like answer', () => {
    const out = buildMixedInputRepeatFallback({
      userText: 'я люблю фары',
      tense: 'present_simple',
    })

    expect(out).toBe('I like headlights.')
    expect(hasRussianDialogueFallbackSignal('я люблю фары')).toBe(true)
    expect(hasRussianDialogueFallbackSignal('фары')).toBe(false)
  })

  it('builds a specific English repeat for mixed dacha sunbathing input', () => {
    const out = buildMixedInputRepeatFallback({
      userText: 'I загораю на даче',
      tense: 'present_simple',
    })
    const comment = buildMixedDialogueFallbackComment({
      audience: 'adult',
      level: 'a2',
      userText: 'I загораю на даче',
    })

    expect(out).toBe('I sunbathe at the dacha.')
    expect(comment).toContain('загораю = sunbathe')
    expect(comment).toContain('даче = dacha')
  })

  it('builds a specific English repeat for fully Russian dacha sunbathing input', () => {
    const out = buildMixedInputRepeatFallback({
      userText: 'я загораю на даче',
      tense: 'present_simple',
    })

    expect(out).toBe('I sunbathe at the dacha.')
    expect(hasRussianDialogueFallbackSignal('я загораю на даче')).toBe(true)
  })
})
