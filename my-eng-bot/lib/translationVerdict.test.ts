import { describe, expect, it } from 'vitest'
import { computeTranslationGoldVerdict } from './translationVerdict'

describe('computeTranslationGoldVerdict', () => {
  const ru = 'Я люблю поездки.'

  it('accepts exact match after normalization', () => {
    const gold = 'I like trips.'
    expect(
      computeTranslationGoldVerdict({ userText: 'i like trips', goldEnglish: gold, ruPrompt: ru })
    ).toEqual({ ok: true, reasons: [] })
  })

  it('rejects typo in content word', () => {
    const gold = 'I like trips.'
    const v = computeTranslationGoldVerdict({
      userText: 'I like triips.',
      goldEnglish: gold,
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('gold_mismatch')
  })

  it('rejects Cyrillic in answer', () => {
    const gold = 'I like trips.'
    const v = computeTranslationGoldVerdict({
      userText: 'I like trips поездки',
      goldEnglish: gold,
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('cyrillic_in_answer')
  })

  it('rejects extra English tail', () => {
    const gold = 'I like trips.'
    const v = computeTranslationGoldVerdict({
      userText: 'I like trips around the world every day',
      goldEnglish: gold,
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
  })

  it('rejects truncated answer', () => {
    const gold = 'I like trips.'
    const v = computeTranslationGoldVerdict({
      userText: 'I like.',
      goldEnglish: gold,
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
  })

  it('accepts contraction equivalent to gold', () => {
    const gold = "I don't like trips."
    expect(
      computeTranslationGoldVerdict({
        userText: 'I do not like trips.',
        goldEnglish: gold,
        ruPrompt: 'Я не люблю поездки.',
      })
    ).toEqual({ ok: true, reasons: [] })
  })

  it('allows like vs love for pet context', () => {
    const ruPet = 'Я люблю свою собаку.'
    const gold = 'I like my dog.'
    expect(
      computeTranslationGoldVerdict({
        userText: 'I love my dog.',
        goldEnglish: gold,
        ruPrompt: ruPet,
      })
    ).toEqual({ ok: true, reasons: [] })
  })

  it('does not allow love vs like for non-pet when gold uses like', () => {
    const v = computeTranslationGoldVerdict({
      userText: 'I love trips.',
      goldEnglish: 'I like trips.',
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
  })
})
