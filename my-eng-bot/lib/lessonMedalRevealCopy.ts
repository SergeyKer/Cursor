import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { featureFlags } from '@/lib/featureFlags'
import { coreXpToNextMedalTier, type LessonMedalTierOrNull } from '@/lib/lessonScore'
import { MEDAL_TIER_EMOJI } from '@/lib/medalBadge'
import type { PostLessonAction } from '@/types/lesson'

export type FlowInfoCardVariant = 'gold' | 'silver' | 'bronze' | 'neutral' | 'info' | 'praise'

export type LessonMedalRevealCopyInput = {
  medal: LessonMedalTierOrNull
  coreXp: number
  comboXp: number
  maxCoreXp: number
  corePercent: number
  audience: FooterCopyAudience
}

export type LessonMedalRevealCopy = {
  variant: FlowInfoCardVariant
  icon: string
  title: string
  statsLine: string
  message: string
  goalLine: string | null
  /** @deprecated use goalLine */
  cupLine: string | null
}

const MEDAL_TITLE: Record<NonNullable<LessonMedalTierOrNull>, string> = {
  gold: 'Золотая медаль!',
  silver: 'Серебряная медаль!',
  bronze: 'Бронзовая медаль!',
}

const SCORING_UNITS_APPROX = 13

export function medalGapPercent(coreXp: number, maxCoreXp: number): number {
  const toNext = coreXpToNextMedalTier(coreXp, maxCoreXp)
  if (toNext == null || maxCoreXp <= 0) return 0
  return Math.max(1, Math.ceil((toNext / maxCoreXp) * 100))
}

export function resolveMedalRevealVariant(medal: LessonMedalTierOrNull): FlowInfoCardVariant {
  if (medal === 'gold') return 'gold'
  if (medal === 'silver') return 'silver'
  if (medal === 'bronze') return 'bronze'
  return 'neutral'
}

function formatStatsLine(input: LessonMedalRevealCopyInput): string {
  const { coreXp, comboXp, corePercent, audience } = input
  if (audience === 'child') {
    if (comboXp > 0) {
      return `${coreXp} очков за ответы + ${comboXp} за серию · ${corePercent}% точности`
    }
    return `${coreXp} очков за ответы · ${corePercent}% точности`
  }
  return `${coreXp} core + ${comboXp} combo · ${corePercent}%`
}

function bronzeGapXp(coreXp: number, maxCoreXp: number): number {
  return Math.max(0, Math.ceil(maxCoreXp * 0.5) - coreXp)
}

function isSmallMedalGap(gapXp: number, gapPercent: number, maxCoreXp: number): boolean {
  if (gapPercent <= 8) return true
  const unitApprox = maxCoreXp > 0 ? maxCoreXp / SCORING_UNITS_APPROX : 10
  return gapXp <= Math.ceil(unitApprox * 2)
}

export function formatRetryHook(input: LessonMedalRevealCopyInput): string {
  const { medal, coreXp, maxCoreXp, audience } = input
  const gapXp = coreXpToNextMedalTier(coreXp, maxCoreXp) ?? 0
  const gapPercent = medalGapPercent(coreXp, maxCoreXp)
  const smallGap = isSmallMedalGap(gapXp, gapPercent, maxCoreXp)

  if (medal === 'gold') {
    return audience === 'child'
      ? 'Супер! Почти все ответы верные!'
      : 'Отличный результат по точности ответов.'
  }

  if (medal === 'silver') {
    if (audience === 'child') {
      return smallGap
        ? 'Почти золото! Ещё раз — и твоя!'
        : `Ещё ${gapXp} очков до золота. Попробуй ещё вариант!`
    }
    return smallGap
      ? 'До золотой медали — пара верных ответов. Пройдите ещё вариант.'
      : `До золотой медали: ${gapXp} XP. Ещё один проход.`
  }

  if (medal === 'bronze') {
    if (audience === 'child') {
      return smallGap
        ? 'Почти серебро! Ещё раз — и твоя!'
        : `Ещё ${gapXp} очков до серебра. Попробуй ещё вариант!`
    }
    return smallGap
      ? 'До серебряной медали — пара верных ответов. Пройдите ещё вариант.'
      : `До серебряной медали: ${gapXp} XP. Ещё один проход.`
  }

  const gapToBronze = bronzeGapXp(coreXp, maxCoreXp)
  if (audience === 'child') {
    return smallGap
      ? 'Почти бронза! Ещё раз — попробуй!'
      : `Ещё ${gapToBronze} очков до бронзы. Попробуй ещё вариант!`
  }
  return smallGap
    ? 'До бронзы — пара верных ответов. Пройдите ещё вариант.'
    : `До бронзы: ${gapToBronze} XP. Ещё один проход.`
}

export function formatGoalLine(
  medal: LessonMedalTierOrNull,
  audience: FooterCopyAudience
): string | null {
  if (!featureFlags.practiceTopicCupsV1) return null

  if (medal === 'gold') {
    return audience === 'child'
      ? 'Кубок 🏆 — 5 практик по теме'
      : 'Кубок 🏆 — 5 практик по теме'
  }
  if (medal === 'silver') {
    return 'Сначала золото 🥇, потом кубок 🏆'
  }
  if (medal === 'bronze') {
    return 'Выше медаль → практика → кубок 🏆'
  }
  return audience === 'child'
    ? 'Медаль и кубок 🏆 — через практику'
    : 'Медаль и кубок 🏆 — через практику'
}

export function resolveFinalePrimaryAction(medal: LessonMedalTierOrNull): PostLessonAction {
  return medal === 'gold' ? 'independent_practice' : 'repeat_variant'
}

export function buildFinaleOptionHints(params: {
  medal: LessonMedalTierOrNull
  coreXp: number
  maxCoreXp: number
  audience: FooterCopyAudience
}): Partial<Record<PostLessonAction, string>> {
  const { medal } = params
  const hints: Partial<Record<PostLessonAction, string>> = {}

  if (medal === 'gold') {
    hints.independent_practice = 'С подпиской'
    return hints
  }

  hints.independent_practice = medal === 'silver' ? 'После золота' : 'После медали'
  return hints
}

/** @deprecated use formatGoalLine */
export function formatTopicCupGoalLine(
  medal: LessonMedalTierOrNull,
  audience: FooterCopyAudience
): string | null {
  return formatGoalLine(medal, audience)
}

export function buildLessonMedalRevealCopy(input: LessonMedalRevealCopyInput): LessonMedalRevealCopy {
  const { medal } = input
  const title = medal ? MEDAL_TITLE[medal] : 'Урок пройден!'
  const icon = medal ? MEDAL_TIER_EMOJI[medal] : '○'
  const goalLine = formatGoalLine(medal, input.audience)

  return {
    variant: resolveMedalRevealVariant(medal),
    icon,
    title,
    statsLine: formatStatsLine(input),
    message: formatRetryHook(input),
    goalLine,
    cupLine: goalLine,
  }
}
