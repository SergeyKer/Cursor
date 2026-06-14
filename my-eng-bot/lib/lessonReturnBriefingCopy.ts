import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { LessonMedalTier } from '@/lib/lessonScore'
import type { Bubble } from '@/types/lesson'
import {
  buildLessonReturnHint,
  type LessonReturnHintContext,
} from '@/lib/lessonReturnHint'
import { buildLessonCycle1Hint } from '@/lib/lessonCycle1Hint'
import type { StructuredLessonRunOrigin } from '@/lib/lessonAntiFarm'

export type LessonReturnBriefingKind = 'medal_repeat' | 'cycle1'

export type LessonReturnBriefingCopy = {
  variant: FlowInfoCardVariant
  icon: string
  iconBetweenCaption?: { before: string; after: string }
  title: string
  statsLine: string
  message: string
  secondaryMessage?: string
}

export type LessonReturnBriefingPayload = {
  runKey: string
  kind: LessonReturnBriefingKind
  copy: LessonReturnBriefingCopy
  bubbles: Bubble[]
}

const MEDAL_ICON: Record<LessonMedalTier, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
}

function formatBestTotalXp(bestTotalXp: number): string {
  return String(Math.max(0, Math.floor(bestTotalXp)))
}

function resolveRepeatStatsLine(params: {
  lessonTitle: string
  bestTotalXp: number
  context: LessonReturnHintContext
  audience: FooterCopyAudience
}): string {
  const title = params.lessonTitle.trim() || 'Урок'
  const recordXp = formatBestTotalXp(params.bestTotalXp)
  if (params.context === 'post_lesson_repeat') {
    return params.audience === 'child'
      ? `${title} · повтор · рекорд ${recordXp} XP`
      : `${title} · повтор · рекорд ${recordXp} XP`
  }
  return params.audience === 'child'
    ? `${title} · рекорд ${recordXp} XP`
    : `${title} · рекорд ${recordXp} XP`
}

export function buildLessonReturnBriefingBubbles(params: {
  lessonTitle: string
  audience: FooterCopyAudience
  kind: LessonReturnBriefingKind
}): Bubble[] {
  const title = params.lessonTitle.trim() || 'Урок'
  const intro = `Урок «${title}». Сначала - коротко о правилах.`
  return [{ type: 'positive', content: intro }]
}

export function buildLessonReturnBriefingCopy(params: {
  medal: LessonMedalTier
  lessonTitle: string
  audience: FooterCopyAudience
  context: LessonReturnHintContext
  bestTotalXp: number
  cycle1Closed?: boolean
  silverCapThisRun?: boolean
}): LessonReturnBriefingCopy {
  const fullText = buildLessonReturnHint(params)
  const lines = fullText.split('\n')
  const medalLine = lines[0] ?? ''
  const xpLine = lines[1] ?? ''
  const capLine = lines[2]

  return {
    variant: 'info',
    icon: MEDAL_ICON[params.medal],
    iconBetweenCaption: { before: 'Engvo AI', after: 'English Voice' },
    title: params.audience === 'child' ? 'Коротко о правилах' : 'Как устроен урок',
    statsLine: resolveRepeatStatsLine({
      lessonTitle: params.lessonTitle,
      bestTotalXp: params.bestTotalXp,
      context: params.context,
      audience: params.audience,
    }),
    message: [medalLine, xpLine].filter(Boolean).join('\n'),
    secondaryMessage: capLine || undefined,
  }
}

export function buildLessonCycle1BriefingCopy(params: {
  lessonTitle: string
  audience: FooterCopyAudience
  origin: StructuredLessonRunOrigin
}): LessonReturnBriefingCopy {
  const fullText = buildLessonCycle1Hint(params)
  const lines = fullText.split('\n').filter(Boolean)
  const title = params.lessonTitle.trim() || 'Урок'

  return {
    variant: 'info',
    icon: '📋',
    iconBetweenCaption: { before: 'Engvo AI', after: 'English Voice' },
    title: params.audience === 'child' ? 'Про этот урок' : 'Про этот урок',
    statsLine: title,
    message: lines[0] ?? fullText,
    secondaryMessage: lines.length > 1 ? lines.slice(1).join('\n') : undefined,
  }
}

export function buildLessonReturnBriefingPayload(params: {
  runKey: string
  lessonTitle: string
  audience: FooterCopyAudience
  kind: LessonReturnBriefingKind
  medal?: LessonMedalTier
  context?: LessonReturnHintContext
  bestTotalXp?: number
  cycle1Closed?: boolean
  silverCapThisRun?: boolean
  origin?: StructuredLessonRunOrigin
}): LessonReturnBriefingPayload {
  const bubbles = buildLessonReturnBriefingBubbles({
    lessonTitle: params.lessonTitle,
    audience: params.audience,
    kind: params.kind,
  })

  const copy =
    params.kind === 'cycle1'
      ? buildLessonCycle1BriefingCopy({
          lessonTitle: params.lessonTitle,
          audience: params.audience,
          origin: params.origin ?? 'menu_reopen',
        })
      : buildLessonReturnBriefingCopy({
          medal: params.medal!,
          lessonTitle: params.lessonTitle,
          audience: params.audience,
          context: params.context ?? 'menu_reopen',
          bestTotalXp: params.bestTotalXp ?? 0,
          cycle1Closed: params.cycle1Closed,
          silverCapThisRun: params.silverCapThisRun,
        })

  return {
    runKey: params.runKey,
    kind: params.kind,
    copy,
    bubbles,
  }
}
