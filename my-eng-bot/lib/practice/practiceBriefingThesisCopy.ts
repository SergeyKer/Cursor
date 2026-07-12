import type { Audience } from '@/lib/types'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import {
  BALANCED_BASE_MASTERY,
  BALANCED_SESSION_LENGTH,
  CHALLENGE_QUALIFYING_MASTERY,
  CHALLENGE_SESSION_LENGTH,
  PRACTICE_COIN_ERROR_FORGIVENESS_COST,
  PRACTICE_DAILY_GLOBAL_XP_CAP,
  PRACTICE_FORGIVENESS_MIN_STEP,
  PRACTICE_RING_MAX,
} from '@/lib/practice/practiceEconomyRules'
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
  forgivenessEnabled?: boolean
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
  return byAudience(
    audience,
    `📝 Победа: ${CHALLENGE_QUALIFYING_MASTERY} из ${CHALLENGE_SESSION_LENGTH} сразу правильно.`,
    `📝 Цель: ${CHALLENGE_QUALIFYING_MASTERY} из ${CHALLENGE_SESSION_LENGTH} с первой попытки.`
  )
}

function balancedGoalLine(params: PracticeBriefingThesisParams): string {
  const { audience } = params
  if (params.tier === 0) {
    return byAudience(
      audience,
      '📌 Сначала медаль в уроке.',
      '📌 База откроется после медали урока.'
    )
  }
  if (params.baseBadgeClaimed) {
    return byAudience(
      audience,
      '📌 Значок за эту тему уже есть.',
      '📌 База за эту тему уже есть.'
    )
  }
  return byAudience(
    audience,
    `📌 Цель: ${BALANCED_BASE_MASTERY} из ${BALANCED_SESSION_LENGTH} сразу правильно.`,
    `📌 Цель: ${BALANCED_BASE_MASTERY} из ${BALANCED_SESSION_LENGTH} с первой попытки.`
  )
}

function challengeExtraLine(params: PracticeBriefingThesisParams): string | null {
  if (params.tier === 0 || params.ringCount >= PRACTICE_RING_MAX) return null
  if (params.lastQualifyingDayKey === params.todayKey) return null
  if (params.pendingPracticeCoins > 0 || params.pendingCup) {
    return byAudience(
      params.audience,
      '🪙 Монеты и кубок ждут золото в уроке.',
      '🪙 Монеты и кубок ждут золотую медаль урока.'
    )
  }
  if (params.forgivenessEnabled) {
    return byAudience(
      params.audience,
      `💡 С ${PRACTICE_FORGIVENESS_MIN_STEP}-го шага 1 ошибку можно простить за ${PRACTICE_COIN_ERROR_FORGIVENESS_COST} монету.`,
      `💡 С ${PRACTICE_FORGIVENESS_MIN_STEP}-го шага 1 ошибку можно пропустить за ${PRACTICE_COIN_ERROR_FORGIVENESS_COST}🪙.`
    )
  }
  return null
}

export function buildPracticeBriefingThesisLines(
  params: PracticeBriefingThesisParams
): string[] {
  const { audience } = params

  if (params.mode === 'reference') {
    return [
      xpLine(params, false),
      byAudience(audience, '⚡ Здесь одно упражнение.', '⚡ Здесь проверка одного упражнения.'),
    ]
  }

  if (params.mode === 'relaxed') {
    return [
      xpLine(params, false),
      params.tier > 0
        ? byAudience(
            audience,
            '🌱 Это разминка — победы и кубка здесь нет.',
            '🌱 Это разминка — цели и кубка здесь нет.'
          )
        : byAudience(
            audience,
            '🌱 Можно потренироваться.',
            '🌱 Можно потренироваться — цели здесь нет.'
          ),
    ]
  }

  if (params.mode === 'balanced') {
    const goal = balancedGoalLine(params)
    return [goal, xpLine(params, true)].slice(0, 3)
  }

  // challenge: цель → XP → страховка/блокер
  const goal = challengeGoalLine(params)
  const lines = [goal, xpLine(params, true)]
  const extra = challengeExtraLine(params)
  if (extra) lines.push(extra)
  return lines.slice(0, 3)
}
