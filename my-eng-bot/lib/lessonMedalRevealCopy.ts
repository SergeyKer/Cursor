import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { coreXpToNextMedalTier, type LessonMedalTierOrNull } from '@/lib/lessonScore'
import { MEDAL_TIER_EMOJI } from '@/lib/medalBadge'

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
}

const MEDAL_TITLE: Record<NonNullable<LessonMedalTierOrNull>, string> = {
  gold: 'Золотая медаль!',
  silver: 'Серебряная медаль!',
  bronze: 'Бронзовая медаль!',
}

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

function formatMessage(input: LessonMedalRevealCopyInput): string {
  const { medal, coreXp, maxCoreXp, audience } = input
  const gapXp = coreXpToNextMedalTier(coreXp, maxCoreXp) ?? 0
  const gapPercent = medalGapPercent(coreXp, maxCoreXp)

  if (medal === 'gold') {
    return audience === 'child'
      ? 'Супер! Почти все ответы верные!'
      : 'Отличный результат по точности ответов.'
  }

  if (medal === 'silver') {
    if (audience === 'child') {
      return gapPercent <= 8 ? 'Почти золото!' : `До золота: ещё ${gapXp} очков`
    }
    return `До золота: ${gapXp} XP за шаги`
  }

  if (medal === 'bronze') {
    if (audience === 'child') {
      return gapPercent <= 8 ? 'Почти серебро!' : `До серебра: ещё ${gapXp} очков`
    }
    return `До серебряной медали: ${gapXp} XP за шаги`
  }

  const gapToBronze = bronzeGapXp(coreXp, maxCoreXp)
  return audience === 'child'
    ? `До бронзы: ещё ${gapToBronze} очков`
    : `До бронзы: ${gapToBronze} XP за шаги`
}

export function buildLessonMedalRevealCopy(input: LessonMedalRevealCopyInput): LessonMedalRevealCopy {
  const { medal } = input
  const title = medal ? MEDAL_TITLE[medal] : 'Урок пройден!'
  const icon = medal ? MEDAL_TIER_EMOJI[medal] : '○'

  return {
    variant: resolveMedalRevealVariant(medal),
    icon,
    title,
    statsLine: formatStatsLine(input),
    message: formatMessage(input),
  }
}
