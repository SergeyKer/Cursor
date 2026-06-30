'use client'

import {
  EMOJI_LINE_CLASS,
  FOOTER_STAT_GLYPH_CLASS,
  FOOTER_STAT_VALUE_CLASS,
  TRUNCATE_X_CLASS,
  footerStatGlyphNudgeClass,
  splitLeadingEmoji,
} from '@/lib/emojiText'

type EmojiLeadingStatTextProps = {
  text: string
  highlight?: string
  allowTextShrink?: boolean
  className?: string
  textClassName?: string
}

export default function EmojiLeadingStatText({
  text,
  highlight = '',
  allowTextShrink = false,
  className = '',
  textClassName: textClassNameOverride,
}: EmojiLeadingStatTextProps) {
  const parts = splitLeadingEmoji(text)
  if (parts) {
    const textClassName =
      textClassNameOverride ??
      (allowTextShrink
        ? `${TRUNCATE_X_CLASS} min-w-0 ${FOOTER_STAT_VALUE_CLASS} ${highlight}`.trim()
        : `shrink-0 ${FOOTER_STAT_VALUE_CLASS} ${highlight}`.trim())
    return (
      <span
        className={`inline-flex max-w-full min-w-0 items-center justify-start gap-2 overflow-visible ${className}`.trim()}
      >
        <span
          className={`${FOOTER_STAT_GLYPH_CLASS} ${footerStatGlyphNudgeClass(parts.emoji)} ${highlight}`.trim()}
          aria-hidden
        >
          {parts.emoji}
        </span>
        <span className={textClassName}>{parts.rest.trimStart()}</span>
      </span>
    )
  }

  return (
    <span
      className={`${TRUNCATE_X_CLASS} text-left ${FOOTER_STAT_VALUE_CLASS} ${EMOJI_LINE_CLASS} ${highlight} ${className}`.trim()}
    >
      {text}
    </span>
  )
}
