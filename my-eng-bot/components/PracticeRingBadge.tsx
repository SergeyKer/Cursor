'use client'

import { EMOJI_GLYPH_CLASS, FOOTER_STAT_MEDAL_SLOT_CLASS } from '@/lib/emojiText'
import type { MedalBadgeSize } from '@/lib/medalBadge'
import { PRACTICE_PROGRESS_GLYPH } from '@/lib/practice/practiceGlyphs'

export type PracticeRingBadgeProps = {
  size?: MedalBadgeSize
  title?: string
  className?: string
}

export default function PracticeRingBadge({
  size = 'sm',
  title = 'Практик по теме',
  className = '',
}: PracticeRingBadgeProps) {
  const glyphSizeClass = size === 'md' ? 'text-[1.5rem]' : 'text-[1.375rem]'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`.trim()}
      title={title}
      aria-label={title}
    >
      <span
        className={`${FOOTER_STAT_MEDAL_SLOT_CLASS} ${EMOJI_GLYPH_CLASS} ${glyphSizeClass} leading-none`}
        aria-hidden
      >
        {PRACTICE_PROGRESS_GLYPH}
      </span>
    </span>
  )
}
