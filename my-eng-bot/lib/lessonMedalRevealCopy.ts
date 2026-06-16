import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { LessonCoinAward } from '@/lib/coinAwards'
import { formatLessonCoinAwardLine } from '@/lib/lessonCoinAwardCopy'
import {
  buildFinaleOptionHints as buildFinaleOptionHintsFromCta,
  resolveFinalePrimaryAction as resolveFinalePrimaryActionFromCta,
} from '@/lib/lessonFinaleCta'
import {
  formatLessonFinaleGoalLine,
  formatLessonFirstTryLine,
  formatLessonProfileLine,
  formatLessonStatsLine,
  formatLessonVerdictLine,
} from '@/lib/lessonScoreCopy'
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
  previousCorePercent?: number | null
  profileMedal?: LessonMedalTierOrNull
  firstTryCount?: number
  totalScoredUnits?: number
  coinAward?: LessonCoinAward | null
}

export type LessonMedalRevealCopy = {
  variant: FlowInfoCardVariant
  icon: string
  title: string
  statsLine: string
  firstTryLine: string | null
  message: string
  profileLine: string | null
  goalLine: string | null
  coinLine: string | null
  /** @deprecated use goalLine */
  cupLine: string | null
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

export function resolveFinalePrimaryAction(
  params:
    | LessonMedalTierOrNull
    | {
        runMedal: LessonMedalTierOrNull
        profileMedal?: LessonMedalTierOrNull
        medal?: LessonMedalTierOrNull
      }
): PostLessonAction {
  if (typeof params === 'string' || params === null) {
    return resolveFinalePrimaryActionFromCta({ runMedal: params, profileMedal: null })
  }
  const runMedal = params.runMedal ?? params.medal ?? null
  const profileMedal = params.profileMedal ?? null
  return resolveFinalePrimaryActionFromCta({ runMedal, profileMedal })
}

export function buildFinaleOptionHints(params: {
  medal?: LessonMedalTierOrNull
  runMedal?: LessonMedalTierOrNull
  profileMedal?: LessonMedalTierOrNull
  coreXp: number
  maxCoreXp: number
  audience: FooterCopyAudience
}): Partial<Record<PostLessonAction, string>> {
  const runMedal = params.runMedal ?? params.medal ?? null
  const profileMedal = params.profileMedal ?? null
  return buildFinaleOptionHintsFromCta({ runMedal, profileMedal, audience: params.audience })
}

/** @deprecated replaced by formatLessonFinaleGoalLine */
export function formatGoalLine(
  _medal: LessonMedalTierOrNull,
  _audience: FooterCopyAudience
): string | null {
  return null
}

/** @deprecated use formatGoalLine */
export function formatTopicCupGoalLine(
  medal: LessonMedalTierOrNull,
  audience: FooterCopyAudience
): string | null {
  return formatGoalLine(medal, audience)
}

export function buildLessonMedalRevealCopy(input: LessonMedalRevealCopyInput): LessonMedalRevealCopy {
  const { medal, corePercent, comboXp, audience } = input
  const profileMedal = input.profileMedal ?? null
  const previousCorePercent = input.previousCorePercent ?? null
  const firstTryCount = input.firstTryCount ?? 0
  const totalScoredUnits = input.totalScoredUnits ?? 0
  const title = medal ? MEDAL_TITLE[medal] : 'Урок пройден!'
  const icon = medal ? MEDAL_TIER_EMOJI[medal] : '○'
  const goalLine = formatLessonFinaleGoalLine({ profileMedal, runMedal: medal, audience })
  const coinLine = input.coinAward
    ? formatLessonCoinAwardLine({ coinAward: input.coinAward, audience })
    : null

  return {
    variant: resolveMedalRevealVariant(medal),
    icon,
    title,
    statsLine: formatLessonStatsLine({
      coreXp: input.coreXp,
      maxCoreXp: input.maxCoreXp,
      corePercent,
      comboXp,
      audience,
    }),
    firstTryLine: formatLessonFirstTryLine({ firstTryCount, totalScoredUnits, audience }),
    message: formatLessonVerdictLine({
      corePercent,
      previousCorePercent,
      profileMedal,
      runMedal: medal,
      audience,
    }),
    profileLine: formatLessonProfileLine({ profileMedal, runMedal: medal, audience }),
    goalLine,
    coinLine,
    cupLine: goalLine,
  }
}
