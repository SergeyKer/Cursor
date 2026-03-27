import { describe, expect, it } from 'vitest'
import { buildMixedDialogueFallbackComment, buildMixedInputRepeatFallback } from './mixedInputRepeatFallback'

describe('buildMixedInputRepeatFallback', () => {
  it('screenshot case: I like eat хлеб → contextual English', () => {
    expect(
      buildMixedInputRepeatFallback({
        userText: 'I like eat хлеб',
        tense: 'present_simple',
      }),
    ).toBe('I like to eat bread.')
  })

  it('falls back to generic when no mappable Russian and no like/to fix', () => {
    const r = buildMixedInputRepeatFallback({
      userText: 'hello мирф',
      tense: 'present_simple',
    })
    expect(r).toBe('I usually answer in English.')
  })

  it('visit + known place still works', () => {
    expect(
      buildMixedInputRepeatFallback({
        userText: 'I visit Питер',
        tense: 'present_simple',
      }),
    ).toMatch(/visit St\. Petersburg/)
  })
})

describe('buildMixedDialogueFallbackComment', () => {
  it('does not use only tense name; mentions English-only and like to', () => {
    const c = buildMixedDialogueFallbackComment({ audience: 'adult', level: 'b1' })
    expect(c).toMatch(/английск/i)
    expect(c).toMatch(/like/i)
    expect(c).not.toMatch(/Present Simple/)
  })
})
