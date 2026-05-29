'use client'

import { FROZEN_LESSON_MEDAL_EMOJI, medalTierEmoji, type MedalBadgeSize } from '@/lib/medalBadge'
import { EMOJI_GLYPH_CLASS, FOOTER_STAT_MEDAL_SLOT_CLASS } from '@/lib/emojiText'
import type { LessonMedalTier } from '@/lib/lessonScore'
import type { LessonFrozenMedalGlyph } from '@/lib/medalBadge'

export type MedalBadgeProps = {
  tier?: LessonMedalTier
  size?: MedalBadgeSize
  muted?: boolean
  frozen?: LessonFrozenMedalGlyph
  title?: string
  className?: string
}

export default function MedalBadge({
  tier = 'bronze',
  size = 'sm',
  muted = false,
  frozen,
  title,
  className = '',
}: MedalBadgeProps) {
  const isFrozen = frozen === 'military'
  const label = title ?? (isFrozen ? 'Урок начат' : `Медаль ${medalTierEmoji(tier)}`)
  const glyphSizeClass = size === 'md' ? 'text-[1.5rem]' : 'text-[1.375rem]'
  const toneClass = isFrozen ? 'opacity-40 grayscale' : muted ? 'opacity-55' : ''

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${toneClass} ${className}`.trim()}
      title={label}
      aria-label={label}
    >
      <span
        className={`${FOOTER_STAT_MEDAL_SLOT_CLASS} ${EMOJI_GLYPH_CLASS} ${glyphSizeClass} leading-none`}
        aria-hidden
      >
        {isFrozen ? FROZEN_LESSON_MEDAL_EMOJI : medalTierEmoji(tier)}
      </span>
    </span>
  )
}
