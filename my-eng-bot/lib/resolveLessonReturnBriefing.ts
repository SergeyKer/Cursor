import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { StructuredLessonRunOrigin } from '@/lib/lessonAntiFarm'
import { resolveLessonSilverCapForRun } from '@/lib/lessonAntiFarm'
import type { LessonCoinIntroContext } from '@/lib/lessonCoinIntroCopy'
import {
  buildLessonReturnBriefingPayload,
  type LessonReturnBriefingPayload,
} from '@/lib/lessonReturnBriefingCopy'
import type { LessonReturnHintContext } from '@/lib/lessonReturnHint'
import { isLessonStartedForMenu } from '@/lib/lessonFooter'
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

export function resolveLessonReturnBriefing(
  input: ResolveLessonReturnBriefingInput
): LessonReturnBriefingPayload | null {
  const runKey = buildLessonReturnBriefingRunKey(input.lessonId, input.runKey)
  if (input.acknowledgedRunKey === runKey) return null

  const progress = loadLessonProgress(input.lessonId)
  const lessonTitle = input.lessonTitle.trim() || 'Урок'

  if (progress?.cycle1Closed && !progress.medal) {
    return buildLessonReturnBriefingPayload({
      runKey,
      lessonTitle,
      audience: input.audience,
      kind: 'cycle1',
      origin: input.origin,
    })
  }

  if (progress?.medal) {
    const hintContext: LessonReturnHintContext =
      input.origin === 'post_lesson_repeat' || input.origin === 'repeat_api'
        ? 'post_lesson_repeat'
        : 'menu_reopen'
    return buildLessonReturnBriefingPayload({
      runKey,
      lessonTitle,
      audience: input.audience,
      kind: 'medal_repeat',
      medal: progress.medal,
      context: hintContext,
      bestTotalXp: progress.bestTotalXp ?? 0,
      cycle1Closed: progress.cycle1Closed === true,
      silverCapThisRun: resolveLessonSilverCapForRun({
        origin: input.origin,
        variantNumber: input.variantNumber,
        cycle1Closed: progress.cycle1Closed === true,
        isRepeatRun: input.isRepeatRun,
      }),
      origin: input.origin,
      coinIntroContext: input.coinIntroContext,
    })
  }

  if (!isLessonStartedForMenu(progress)) {
    return buildLessonReturnBriefingPayload({
      runKey,
      lessonTitle,
      audience: input.audience,
      kind: 'first_run',
      origin: input.origin,
      coinIntroContext: input.coinIntroContext,
    })
  }

  return null
}
