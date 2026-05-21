import type { LessonMedalTierOrNull } from '@/lib/lessonScore'

export type PracticeEconomyTier = 0 | 1 | 2

export function resolvePracticeEconomyTier(lessonMedal: LessonMedalTierOrNull | undefined | null): PracticeEconomyTier {
  if (!lessonMedal) return 0
  if (lessonMedal === 'gold') return 2
  return 1
}
