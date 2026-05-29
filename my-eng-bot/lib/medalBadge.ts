import type { LessonMedalTier } from '@/lib/lessonScore'

/** Unicode place medals (U+1F947–U+1F949). */
export const MEDAL_TIER_EMOJI: Record<LessonMedalTier, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
}

export type MedalBadgeSize = 'sm' | 'md'

export type LessonFrozenMedalGlyph = 'military'

/** Медаль без цифры места — «урок начат / заморожено». */
export const FROZEN_LESSON_MEDAL_EMOJI = '🎖️'

export function medalTierEmoji(tier: LessonMedalTier): string {
  return MEDAL_TIER_EMOJI[tier]
}

/** Текст прогресса медали в футере урока, напр. «До 🥈: 46%». */
export function formatMedalProgressFooterText(
  nextTier: LessonMedalTier,
  progressPercent: number
): string {
  return `До ${medalTierEmoji(nextTier)}: ${progressPercent}%`
}
