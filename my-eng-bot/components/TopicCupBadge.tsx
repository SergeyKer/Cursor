'use client'

import { EMOJI_GLYPH_CLASS, FOOTER_STAT_MEDAL_SLOT_CLASS } from '@/lib/emojiText'
import type { MedalBadgeSize } from '@/lib/medalBadge'

export type TopicCupBadgeProps = {
  size?: MedalBadgeSize
  title?: string
  className?: string
}

export default function TopicCupBadge({
  size = 'sm',
  title = 'Тема сдана: золото + 5 практик',
  className = '',
}: TopicCupBadgeProps) {
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
        🏆
      </span>
    </span>
  )
}
