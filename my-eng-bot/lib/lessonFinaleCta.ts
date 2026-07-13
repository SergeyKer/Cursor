import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { hasGoldUnlocked } from '@/lib/lessonScoreCopy'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { PostLessonAction } from '@/types/lesson'

export const LESSON_REPEAT_VARIANT_LABEL = 'Новый сюжет'
export const LESSON_REPEAT_VARIANT_BUSY_LABEL = 'Генерируем новый сюжет...'

export const FINALE_POST_LESSON_ACTIONS: PostLessonAction[] = [
  'repeat_variant',
  'independent_practice',
]

export function resolveFinalePrimaryAction(params: {
  runMedal: LessonMedalTierOrNull
  profileMedal: LessonMedalTierOrNull
}): PostLessonAction {
  return hasGoldUnlocked(params.profileMedal, params.runMedal)
    ? 'independent_practice'
    : 'repeat_variant'
}

export function buildFinaleOptionHints(params: {
  runMedal: LessonMedalTierOrNull
  profileMedal: LessonMedalTierOrNull
  audience: FooterCopyAudience
}): Partial<Record<PostLessonAction, string>> {
  const { runMedal, profileMedal } = params
  const hints: Partial<Record<PostLessonAction, string>> = {}

  if (!hasGoldUnlocked(profileMedal, runMedal)) {
    hints.independent_practice = 'Скоро'
  }

  return hints
}
