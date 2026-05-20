'use client'

import { medalTierEmoji, type MedalBadgeSize } from '@/lib/medalBadge'
import { EMOJI_GLYPH_CLASS, FOOTER_STAT_MEDAL_SLOT_CLASS } from '@/lib/emojiText'
import type { LessonMedalTier } from '@/lib/lessonScore'

export type MedalBadgeProps = {
  tier: LessonMedalTier
  size?: MedalBadgeSize
  muted?: boolean
  title?: string
  className?: string
}

export default function MedalBadge({
  tier,
  size = 'sm',
  muted = false,
  title,
  className = '',
}: MedalBadgeProps) {
  const label = title ?? `Медаль ${medalTierEmoji(tier)}`
  const glyphSizeClass = size === 'md' ? 'text-[1.5rem]' : 'text-[1.375rem]'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${muted ? 'opacity-55' : ''} ${className}`.trim()}
      title={label}
      aria-label={label}
    >
      <span
        className={`${FOOTER_STAT_MEDAL_SLOT_CLASS} ${EMOJI_GLYPH_CLASS} ${glyphSizeClass} leading-none`}
        aria-hidden
      >
        {medalTierEmoji(tier)}
      </span>
    </span>
  )
}
