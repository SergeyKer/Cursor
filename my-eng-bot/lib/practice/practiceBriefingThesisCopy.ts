import type { Audience } from '@/lib/types'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import {
  BALANCED_BASE_MASTERY,
  BALANCED_SESSION_LENGTH,
  CHALLENGE_QUALIFYING_MASTERY,
  CHALLENGE_SESSION_LENGTH,
  PRACTICE_DAILY_GLOBAL_XP_CAP,
  PRACTICE_RING_MAX,
} from '@/lib/practice/practiceEconomyRules'
import { practiceBadgeRankEmoji } from '@/lib/practice/practiceBadges'
import {
  buildChallengeBriefingCoinLine,
  buildNonChallengeNoCoinsLine,
} from '@/lib/practice/practiceCoinExplainCopy'
import type { PracticeMode } from '@/types/practice'

export type PracticeBriefingThesisParams = {
  mode: PracticeMode
  tier: PracticeEconomyTier
  ringCount: number
  lastQualifyingDayKey?: string | null
  todayKey: string
  baseBadgeClaimed: boolean
  pendingPracticeCoins: number
  pendingCup: boolean
  practiceGlobalXpToday: number
  audience: Audience
  /** Kept for callers; Challenge briefing no longer shows forgiveness. */
  forgivenessEnabled?: boolean
  lessonId?: string
  badgeBriefingLine?: string | null
}

function byAudience(audience: Audience, child: string, adult: string): string {
  return audience === 'child' ? child : adult
}

function xpLine(params: PracticeBriefingThesisParams, underGoal: boolean): string {
  const { audience } = params
  if (params.mode === 'reference') {
    return byAudience(
      audience,
      '⭐ В этом режиме XP к уровню нет.',
      '⭐ XP к уровню в этом режиме не входит.'
    )
  }
  if (params.tier === 0) {
    return byAudience(
      audience,
      '⭐ Сначала возьми медаль в уроке — тогда откроется XP.',
      '⭐ Без медали урока XP к уровню не откроется.'
    )
  }
  if (params.practiceGlobalXpToday >= PRACTICE_DAILY_GLOBAL_XP_CAP) {
    return byAudience(
      audience,
      '⭐ XP на сегодня уже собраны.',
      '⭐ XP к уровню на сегодня уже набраны.'
    )
  }
  if (
    params.mode === 'challenge' &&
    (params.lastQualifyingDayKey === params.todayKey || params.ringCount >= PRACTICE_RING_MAX)
  ) {
    return byAudience(
      audience,
      '⭐ XP ещё можно немного добавить.',
      '⭐ XP к уровню ещё может прибавиться.'
    )
  }
  if (underGoal) {
    return byAudience(
      audience,
      '⭐ Ещё XP — если больше половины сразу правильно.',
      '⭐ XP к уровню — если больше половины с первой попытки.'
    )
  }
  return byAudience(
    audience,
    '⭐ Больше половины сразу правильно — дадим XP.',
    '⭐ Больше половины с первой попытки — XP к уровню.'
  )
}

function challengeGoalLine(params: PracticeBriefingThesisParams): string {
  const { audience } = params
  if (params.tier === 0) {
    return byAudience(
      audience,
      '📝 Победа откроется после медали урока.',
      '📝 Цель откроется после медали урока.'
    )
  }
  if (params.ringCount >= PRACTICE_RING_MAX) {
    return byAudience(audience, '🏆 Кубок уже собран.', '🏆 Кубок уже собран.')
  }
  if (params.lastQualifyingDayKey === params.todayKey) {
    return byAudience(
      audience,
      '📝 Победа на сегодня уже есть — завтра снова.',
      '📝 Цель на сегодня уже закрыта — завтра снова.'
    )
  }
  const rings = Math.max(0, Math.min(PRACTICE_RING_MAX, Math.floor(params.ringCount)))
  return byAudience(
    audience,
    `📝 Победа: ${CHALLENGE_QUALIFYING_MASTERY}/${CHALLENGE_SESSION_LENGTH} · сейчас ${rings}/${PRACTICE_RING_MAX}.`,
    `📝 Цель: ${CHALLENGE_QUALIFYING_MASTERY}/${CHALLENGE_SESSION_LENGTH} · сейчас ${rings}/${PRACTICE_RING_MAX}.`
  )
}

function balancedGoalLine(params: PracticeBriefingThesisParams): string {
  const { audience } = params
  const rank1 = practiceBadgeRankEmoji(1)
  if (params.tier === 0) {
    return byAudience(
      audience,
      '📌 Сначала медаль в уроке.',
      '📌 Цель откроется после медали урока.'
    )
  }
  if (params.badgeBriefingLine) {
    return params.badgeBriefingLine
  }
  if (params.baseBadgeClaimed) {
    return byAudience(
      audience,
      `${rank1} Значок темы уже открыт — смотри следующую ступень в Прогрессе.`,
      `${rank1} Значок темы уже открыт — следующая ступень в Прогрессе.`
    )
  }
  return byAudience(
    audience,
    `${rank1} Цель: ${BALANCED_BASE_MASTERY} из ${BALANCED_SESSION_LENGTH} сразу правильно.`,
    `${rank1} Цель: ${BALANCED_BASE_MASTERY} из ${BALANCED_SESSION_LENGTH} с первой попытки.`
  )
}

export function buildPracticeBriefingThesisLines(
  params: PracticeBriefingThesisParams
): string[] {
  const { audience } = params
  const badgeLine =
    params.badgeBriefingLine && params.tier > 0 ? params.badgeBriefingLine : null

  if (params.mode === 'reference') {
    return [xpLine(params, false), buildNonChallengeNoCoinsLine('reference', audience)]
  }

  if (params.mode === 'relaxed') {
    return [xpLine(params, false), buildNonChallengeNoCoinsLine('relaxed', audience)].slice(0, 3)
  }

  if (params.mode === 'balanced') {
    const goal = balancedGoalLine(params)
    const noCoins = buildNonChallengeNoCoinsLine('balanced', audience)
    return [goal, noCoins, xpLine(params, true)].slice(0, 3)
  }

  const goal = challengeGoalLine(params)
  const lines = [goal, xpLine(params, true)]
  const coinLine = buildChallengeBriefingCoinLine({
    tier: params.tier,
    ringCount: params.ringCount,
    lastQualifyingDayKey: params.lastQualifyingDayKey,
    todayKey: params.todayKey,
    pendingPracticeCoins: params.pendingPracticeCoins,
    pendingCup: params.pendingCup,
    audience: params.audience,
  })
  const third = coinLine ?? badgeLine
  if (third) lines.push(third)
  return lines.slice(0, 3)
}
