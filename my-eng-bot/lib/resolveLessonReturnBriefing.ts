import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { StructuredLessonRunOrigin } from '@/lib/lessonAntiFarm'
import { resolveLessonSilverCapForRun } from '@/lib/lessonAntiFarm'
import type { LessonCoinIntroContext } from '@/lib/lessonCoinIntroCopy'
import {
  buildLessonReturnBriefingPayload,
  type LessonReturnBriefingPayload,
} from '@/lib/lessonReturnBriefingCopy'
import type { LessonReturnHintContext } from '@/lib/lessonReturnHint'
import { loadLessonProgress } from '@/lib/lessonProgressStorage'

export type ResolveLessonReturnBriefingInput = {
  lessonId: string
  runKey?: string | null
  lessonTitle: string
  audience: FooterCopyAudience
  origin: StructuredLessonRunOrigin
  variantNumber: number
  isRepeatRun: boolean
  coinIntroContext?: LessonCoinIntroContext | null
  acknowledgedRunKey?: string | null
}

export function buildLessonReturnBriefingRunKey(lessonId: string, runKey?: string | null): string {
  return `${lessonId}:${runKey ?? 'static'}`
}

function resolveBriefingContext(origin: StructuredLessonRunOrigin): LessonReturnHintContext {
  return origin === 'post_lesson_repeat' || origin === 'repeat_api'
    ? 'post_lesson_repeat'
    : 'menu_reopen'
}

export function resolveLessonReturnBriefing(
  input: ResolveLessonReturnBriefingInput
): LessonReturnBriefingPayload | null {
  const runKey = buildLessonReturnBriefingRunKey(input.lessonId, input.runKey)
  if (input.acknowledgedRunKey === runKey) return null

  const progress = loadLessonProgress(input.lessonId)
  const lessonTitle = input.lessonTitle.trim() || 'Урок'
  const context = resolveBriefingContext(input.origin)
  const cycle1Closed = progress?.cycle1Closed === true
  const silverCapThisRun = resolveLessonSilverCapForRun({
    origin: input.origin,
    variantNumber: input.variantNumber,
    cycle1Closed,
    isRepeatRun: input.isRepeatRun,
  })
  const sharedParams = {
    runKey,
    lessonTitle,
    audience: input.audience,
    context,
    bestTotalXp: progress?.bestTotalXp ?? 0,
    silverCapThisRun,
    origin: input.origin,
    coinIntroContext: input.coinIntroContext,
  }

  if (cycle1Closed && !progress?.medal) {
    return buildLessonReturnBriefingPayload({
      ...sharedParams,
      kind: 'cycle1',
    })
  }

  if (progress?.medal) {
    return buildLessonReturnBriefingPayload({
      ...sharedParams,
      kind: 'medal_repeat',
    })
  }

  if (!progress?.medal && !cycle1Closed) {
    return buildLessonReturnBriefingPayload({
      ...sharedParams,
      kind: 'first_run',
    })
  }

  return null
}
