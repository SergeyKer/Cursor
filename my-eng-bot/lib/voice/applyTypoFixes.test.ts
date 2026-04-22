import { describe, expect, it } from 'vitest'
import { applyTypoFixes, getTypoMapForTests } from './applyTypoFixes'

describe('applyTypoFixes', () => {
  it('replaces known whole-word typos in english text', () => {
    expect(applyTypoFixes('teh cat adn teh dog')).toBe('the cat and the dog')
  })

  it('preserves title case for known typo replacements', () => {
    expect(applyTypoFixes('Recieve the box')).toBe('Receive the box')
  })

  it('skips non-latin dominant text', () => {
    expect(applyTypoFixes('кот и teh')).toBe('кот и teh')
  })

  it('does not replace all-caps abbreviations or title-case names', () => {
    expect(applyTypoFixes('CTA is valid and Wild is a surname')).toBe('CTA is valid and Wild is a surname')
  })

  it('keeps map intentionally conservative', () => {
    expect(getTypoMapForTests()).not.toHaveProperty('wild')
  })
})
