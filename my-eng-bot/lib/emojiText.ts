/** Detect pictographic characters (emoji) in user-facing strings. */
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u

const LEADING_EMOJI_PATTERN = /^(\p{Extended_Pictographic})(.*)$/u

export function textHasEmoji(text: string): boolean {
  return EMOJI_PATTERN.test(text)
}

/** Split "🎯0%" / "🔥×0" into glyph + suffix for layout without shared truncate box. */
export function splitLeadingEmoji(text: string): { emoji: string; rest: string } | null {
  const match = LEADING_EMOJI_PATTERN.exec(text.trim())
  if (!match) return null
  return { emoji: match[1], rest: match[2] }
}

/**
 * Horizontal ellipsis; uses overflow-x: clip so overflow-y stays visible (unlike hidden).
 */
export const TRUNCATE_X_CLASS = 'min-w-0 truncate-x whitespace-nowrap'

/** Inline text row that may mix emoji with numbers/labels (footer stats, tickers). */
export const EMOJI_LINE_CLASS = 'emoji-line'

/** Standalone emoji glyph (medals, markers, menu icons). */
export const EMOJI_GLYPH_CLASS = 'emoji-glyph'

/** Lesson footer stat icons (goal, xp, combo) — fixed 22px box. */
export const FOOTER_STAT_GLYPH_CLASS = 'footer-stat-glyph emoji-glyph'

/** Numeric/text value paired with footer-stat-glyph — matched line-height for vertical centering. */
export const FOOTER_STAT_VALUE_CLASS = 'footer-stat-value'

/** SVG medal — same cell size as footer-stat-glyph. */
export const FOOTER_STAT_MEDAL_SLOT_CLASS = 'footer-stat-medal-slot'
