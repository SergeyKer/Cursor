import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { LessonMedalTier } from '@/lib/lessonScore'
import type { Bubble } from '@/types/lesson'
import type { LessonReturnHintContext } from '@/lib/lessonReturnHint'
import { buildLessonCycle1Hint } from '@/lib/lessonCycle1Hint'
import type { LessonCoinIntroContext } from '@/lib/lessonCoinIntroCopy'
import {
  buildLessonRepeatBriefingThesisLines,
  shouldOfferGenerateVariantOnReturnBriefing,
} from '@/lib/lessonRepeatBriefingThesisCopy'
import { resolveLessonVariantDualCtaLabels } from '@/lib/lessonVariantCtaCopy'
import type { StructuredLessonRunOrigin } from '@/lib/lessonAntiFarm'
import { buildLessonFirstRunBriefingCopy } from '@/lib/lessonFirstRunBriefingCopy'

export type LessonReturnBriefingKind = 'medal_repeat' | 'cycle1' | 'first_run'

export type LessonReturnBriefingCopy = {
  variant: FlowInfoCardVariant
  title: string
  statsLine: string
  message: string
  secondaryMessage?: string
}

export type LessonReturnBriefingActions = {
  offerGenerateVariant: boolean
  primaryLabel: string
  secondaryLabel?: string
}

export type LessonReturnBriefingPayload = {
  runKey: string
  kind: LessonReturnBriefingKind
  copy: LessonReturnBriefingCopy
  actions: LessonReturnBriefingActions
  bubbles: Bubble[]
}

export function buildLessonReturnBriefingBubbles(params: {
  lessonTitle: string
  audience: FooterCopyAudience
  kind: LessonReturnBriefingKind
}): Bubble[] {
  const title = params.lessonTitle.trim() || 'Урок'
  const intro =
    params.kind === 'first_run'
      ? `Урок «${title}». Сначала — коротко о прохождении.`
      : `Урок «${title}». Сначала - коротко о правилах.`
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
  coinIntroContext?: LessonCoinIntroContext | null
}): LessonReturnBriefingCopy {
  const coinContext = params.coinIntroContext
  const isGeneratedVariantRun = coinContext?.isGeneratedVariantRun ?? false

  return {
    variant: 'info',
    title: params.audience === 'child' ? 'Коротко о правилах' : 'Как устроен урок',
    statsLine: '',
    message: buildLessonRepeatBriefingThesisLines({
      audience: params.audience,
      lessonCoinClaimed: coinContext?.lessonCoinClaimed ?? false,
      isGeneratedVariantRun,
      silverCapThisRun: params.silverCapThisRun === true,
      context: params.context,
      bestTotalXp: params.bestTotalXp,
    }).join('\n'),
  }
}

export function buildLessonCycle1BriefingCopy(params: {
  lessonTitle: string
  audience: FooterCopyAudience
  origin: StructuredLessonRunOrigin
}): LessonReturnBriefingCopy {
  const fullText = buildLessonCycle1Hint(params)
  const lines = fullText.split('\n').filter(Boolean)

  return {
    variant: 'info',
    title: params.audience === 'child' ? 'Про этот урок' : 'Про этот урок',
    statsLine: '',
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
  coinIntroContext?: LessonCoinIntroContext | null
}): LessonReturnBriefingPayload {
  const bubbles = buildLessonReturnBriefingBubbles({
    lessonTitle: params.lessonTitle,
    audience: params.audience,
    kind: params.kind,
  })

  const context = params.context ?? 'menu_reopen'
  const coinContext = params.coinIntroContext
  const isGeneratedVariantRun = coinContext?.isGeneratedVariantRun ?? false
  const silverCapThisRun = params.silverCapThisRun === true

  const copy =
    params.kind === 'cycle1'
      ? buildLessonCycle1BriefingCopy({
          lessonTitle: params.lessonTitle,
          audience: params.audience,
          origin: params.origin ?? 'menu_reopen',
        })
      : params.kind === 'first_run'
        ? buildLessonFirstRunBriefingCopy({
            audience: params.audience,
            coinIntroContext: params.coinIntroContext,
          })
        : buildLessonReturnBriefingCopy({
          medal: params.medal!,
          lessonTitle: params.lessonTitle,
          audience: params.audience,
          context,
          bestTotalXp: params.bestTotalXp ?? 0,
          cycle1Closed: params.cycle1Closed,
          silverCapThisRun,
          coinIntroContext: params.coinIntroContext,
        })

  const offerGenerateVariant =
    params.kind === 'medal_repeat' &&
    shouldOfferGenerateVariantOnReturnBriefing({
      context,
      silverCapThisRun,
      isGeneratedVariantRun,
    })

  const actions: LessonReturnBriefingActions = offerGenerateVariant
    ? {
        offerGenerateVariant: true,
        ...resolveLessonVariantDualCtaLabels({ hasRepeatContext: true }),
      }
    : {
        offerGenerateVariant: false,
        primaryLabel: 'Продолжить',
      }

  return {
    runKey: params.runKey,
    kind: params.kind,
    copy,
    actions,
    bubbles,
  }
}
