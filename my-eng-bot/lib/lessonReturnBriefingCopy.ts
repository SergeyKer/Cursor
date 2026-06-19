import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { Bubble } from '@/types/lesson'
import type { LessonReturnHintContext } from '@/lib/lessonReturnHint'
import type { LessonCoinIntroContext } from '@/lib/lessonCoinIntroCopy'
import {
  buildLessonRepeatBriefingThesisLines,
  shouldOfferGenerateVariantOnReturnBriefing,
  type LessonBriefingKind,
} from '@/lib/lessonRepeatBriefingThesisCopy'
import { resolveLessonVariantDualCtaLabels } from '@/lib/lessonVariantCtaCopy'
import type { StructuredLessonRunOrigin } from '@/lib/lessonAntiFarm'

export type LessonReturnBriefingKind = LessonBriefingKind

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
  return [
    {
      type: 'positive',
      content: `Урок «${title}». Сначала - коротко о правилах.`,
    },
  ]
}

export function buildLessonReturnBriefingCopy(params: {
  briefingKind: LessonReturnBriefingKind
  lessonTitle: string
  audience: FooterCopyAudience
  context: LessonReturnHintContext
  bestTotalXp: number
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
      briefingKind: params.briefingKind,
      lessonCoinClaimed: coinContext?.lessonCoinClaimed ?? false,
      isGeneratedVariantRun,
      silverCapThisRun: params.silverCapThisRun === true,
      context: params.context,
      bestTotalXp: params.bestTotalXp,
    }).join('\n'),
  }
}

export function buildLessonReturnBriefingPayload(params: {
  runKey: string
  lessonTitle: string
  audience: FooterCopyAudience
  kind: LessonReturnBriefingKind
  context?: LessonReturnHintContext
  bestTotalXp?: number
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

  const copy = buildLessonReturnBriefingCopy({
    briefingKind: params.kind,
    lessonTitle: params.lessonTitle,
    audience: params.audience,
    context,
    bestTotalXp: params.bestTotalXp ?? 0,
    silverCapThisRun,
    coinIntroContext: params.coinIntroContext,
  })

  const offerGenerateVariant = shouldOfferGenerateVariantOnReturnBriefing({
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
