import { capMedalForRepeatRun } from '@/lib/lessonScore'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import { loadLessonProgress, saveLessonProgress } from '@/lib/lessonProgressStorage'
import { migrateUserLessonProgress } from '@/lib/lessonProgressMigration'
import { featureFlags } from '@/lib/featureFlags'
import type { UserLessonProgress } from '@/types/userProgress'

export type StructuredLessonRunOrigin = 'menu_reopen' | 'menu_generate' | 'post_lesson_repeat' | 'repeat_api'

export function isLocalStructuredLessonRun(
  origin: StructuredLessonRunOrigin,
  variantNumber: number
): boolean {
  return origin === 'menu_reopen' && variantNumber === 1
}

export function shouldCapGoldToSilver(params: {
  isLocalLesson: boolean
  cycle1Closed: boolean
  isRepeatRun: boolean
}): boolean {
  if (!featureFlags.lessonLocalSilverCapV1) return params.isRepeatRun
  return params.isRepeatRun || (params.isLocalLesson && params.cycle1Closed)
}

export function capLessonMedalForRun(
  earned: LessonMedalTierOrNull,
  params: {
    isLocalLesson: boolean
    cycle1Closed: boolean
    isRepeatRun: boolean
  }
): LessonMedalTierOrNull {
  return capMedalForRepeatRun(earned, shouldCapGoldToSilver(params))
}

export function beginLessonCycle1(
  lessonId: string,
  meta: { topic: string; level: string }
): UserLessonProgress | null {
  if (!featureFlags.lessonLocalSilverCapV1) return null
  const previous = loadLessonProgress(lessonId)
  if (previous?.cycle1Closed === true) return previous
  if (previous?.cycle1Started === true) return previous

  const next = migrateUserLessonProgress(
    {
      ...previous,
      lessonId,
      topic: meta.topic || previous?.topic || '',
      level: meta.level || previous?.level || '',
      cycle1Started: true,
      cycle1Closed: false,
      lessonCycle: 1,
    },
    lessonId
  )
  saveLessonProgress(next)
  return next
}

export function closeLessonCycle1(lessonId: string): UserLessonProgress | null {
  if (!featureFlags.lessonLocalSilverCapV1) return null
  const previous = loadLessonProgress(lessonId)
  if (!previous?.cycle1Started || previous.cycle1Closed === true) return previous

  const next = migrateUserLessonProgress(
    {
      ...previous,
      cycle1Closed: true,
      lessonCycle: 2,
    },
    lessonId
  )
  saveLessonProgress(next)
  return next
}

export function resolveLessonSilverCapForRun(params: {
  origin: StructuredLessonRunOrigin
  variantNumber: number
  cycle1Closed: boolean
  isRepeatRun: boolean
}): boolean {
  return shouldCapGoldToSilver({
    isLocalLesson: isLocalStructuredLessonRun(params.origin, params.variantNumber),
    cycle1Closed: params.cycle1Closed,
    isRepeatRun: params.isRepeatRun,
  })
}
