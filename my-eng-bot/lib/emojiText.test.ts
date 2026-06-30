import { describe, expect, it } from 'vitest'
import { footerStatGlyphNudgeClass, splitLeadingEmoji, textHasEmoji } from '@/lib/emojiText'

describe('textHasEmoji', () => {
  it('detects pictographic characters', () => {
    expect(textHasEmoji('🔥×0')).toBe(true)
    expect(textHasEmoji('🎯54%')).toBe(true)
    expect(textHasEmoji('plain text')).toBe(false)
  })
})

describe('splitLeadingEmoji', () => {
  it('splits lesson footer stat strings', () => {
    expect(splitLeadingEmoji('🎯0%')).toEqual({ emoji: '🎯', rest: '0%' })
    expect(splitLeadingEmoji('🔥×0')).toEqual({ emoji: '🔥', rest: '×0' })
    expect(splitLeadingEmoji('⭐0 XP')).toEqual({ emoji: '⭐', rest: '0 XP' })
  })

  it('returns null when there is no leading emoji', () => {
    expect(splitLeadingEmoji('plain')).toBeNull()
  })
})

describe('footerStatGlyphNudgeClass', () => {
  it('lifts gems glyph in footer stat cells', () => {
    expect(footerStatGlyphNudgeClass('💎')).toBe('footer-stat-glyph--nudge-up')
  })

  it('returns empty string for glyphs that need no nudge', () => {
    expect(footerStatGlyphNudgeClass('⭐')).toBe('')
    expect(footerStatGlyphNudgeClass('🪙')).toBe('')
  })
})
