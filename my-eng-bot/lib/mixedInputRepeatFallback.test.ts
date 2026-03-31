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

  it('present_perfect mixed: full English sense (opponent/match), not generic stub', () => {
    const r = buildMixedInputRepeatFallback({
      userText: 'I have faced that противник был очень сильный и выиграл у нас',
      tense: 'present_perfect',
    })
    expect(r).toMatch(/opponent/i)
    expect(r).not.toMatch(/I have answered in English/i)
  })

  it('visit + known place still works', () => {
    expect(
      buildMixedInputRepeatFallback({
        userText: 'I visit Питер',
        tense: 'present_simple',
      }),
    ).toMatch(/visit St\. Petersburg/)
  })

  it('builds tense-aware repeat for short mixed verb: I сплю', () => {
    expect(
      buildMixedInputRepeatFallback({
        userText: 'I сплю',
        tense: 'future_simple',
      }),
    ).toBe('I will sleep.')
  })
})

describe('buildMixedDialogueFallbackComment', () => {
  it('b1 без like в ответе — не упоминает конструкцию like + to', () => {
    const c = buildMixedDialogueFallbackComment({
      audience: 'adult',
      level: 'b1',
      userText: 'I will fill радость',
    })
    expect(c).toMatch(/английск/i)
    expect(c).not.toMatch(/like\s*\+\s*to|конструкцию like/i)
    expect(c).not.toMatch(/Present Simple/)
  })

  it('b1 с like в ответе — сохраняет совет про like + to', () => {
    const c = buildMixedDialogueFallbackComment({
      audience: 'adult',
      level: 'b1',
      userText: 'I like eat хлеб',
    })
    expect(c).toMatch(/английск/i)
    expect(c).toMatch(/like/i)
    expect(c).not.toMatch(/Present Simple/)
  })
})
