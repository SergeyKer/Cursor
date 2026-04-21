import { describe, expect, it } from 'vitest'

import {
  normalizeTranslationCanonicalGold,
  preferLikeOverEnjoyByRuPrompt,
  shouldPreferLikeOverEnjoyForRuPrompt,
} from './translationCanonicalGold'

describe('translationCanonicalGold', () => {
  it('предпочитает like/don\'t like для RU-предпочтений', () => {
    expect(shouldPreferLikeOverEnjoyForRuPrompt('Я не люблю путешествовать.')).toBe(true)
    expect(preferLikeOverEnjoyByRuPrompt("I don't enjoy traveling.", 'Я не люблю путешествовать.')).toBe(
      "I don't like traveling."
    )
  })

  it('не трогает enjoy вне RU-предпочтений', () => {
    expect(shouldPreferLikeOverEnjoyForRuPrompt('Я наслаждаюсь прогулками.')).toBe(false)
    expect(preferLikeOverEnjoyByRuPrompt('I enjoy walking.', 'Я наслаждаюсь прогулками.')).toBe('I enjoy walking.')
  })

  it('делает единый pipeline: clamp + prefer like + ending', () => {
    const out = normalizeTranslationCanonicalGold({
      goldEnglish: "I don't enjoy traveling on weekends",
      ruPrompt: 'Я не люблю путешествовать.',
    })
    expect(out).toBe("I don't like traveling.")
  })
})
