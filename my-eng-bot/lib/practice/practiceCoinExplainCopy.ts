import { featureFlags } from '@/lib/featureFlags'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import { PRACTICE_RING_MAX } from '@/lib/practice/practiceEconomyRules'
import type { Audience } from '@/lib/types'
import type { PracticeMode } from '@/types/practice'

export type ChallengeBriefingCoinLineParams = {
  tier: PracticeEconomyTier
  ringCount: number
  lastQualifyingDayKey?: string | null
  todayKey: string
  pendingPracticeCoins: number
  pendingCup: boolean
  audience: Audience
  /** Override cups flag for tests. Default: featureFlags.practiceTopicCupsV1 */
  cupsEnabled?: boolean
}

function byAudience(audience: Audience, child: string, adult: string): string {
  return audience === 'child' ? child : adult
}

function cupsOn(override?: boolean): boolean {
  return override ?? featureFlags.practiceTopicCupsV1
}

/** Adult menu Temп blurbs (static options — no child split). */
export function buildPracticeModeEconomyBlurb(
  mode: PracticeMode,
  options?: { cupsEnabled?: boolean }
): string {
  const cups = cupsOn(options?.cupsEnabled)
  if (mode === 'relaxed') return 'Разминка. Зачёта, монет и кубка нет.'
  if (mode === 'balanced') return 'Закрепление и значок темы. Монет и кубка нет.'
  if (mode === 'reference') return 'Одно упражнение. К уровню и монетам не ведёт.'
  // challenge
  return cups
    ? '11/12 → зачёт. 3-й +1, 5-й +2 и кубок (нужно золото урока).'
    : '11/12 → зачёт. 3-й +1, 5-й +2 (нужно золото урока).'
}

export function buildNonChallengeNoCoinsLine(mode: PracticeMode, audience: Audience): string {
  if (mode === 'relaxed') {
    return byAudience(
      audience,
      '🌱 Разминка — зачёта и монет нет (нужен Челлендж).',
      '🌱 Разминка — зачёта и монет нет; для монет нужен Челлендж 12.'
    )
  }
  if (mode === 'balanced') {
    return byAudience(
      audience,
      '🪙 Монет нет — только Челлендж 12.',
      '🪙 Монет и кубка нет — только Челлендж 12.'
    )
  }
  // reference
  return byAudience(
    audience,
    '⚡ Без монет и кубка.',
    '⚡ Без монет и кубка — проверка одного упражнения.'
  )
}

export function canShowChallengeBriefingCoinLine(params: {
  tier: PracticeEconomyTier
  ringCount: number
  lastQualifyingDayKey?: string | null
  todayKey: string
}): boolean {
  if (params.tier <= 0) return false
  if (params.ringCount >= PRACTICE_RING_MAX) return false
  if ((params.lastQualifyingDayKey ?? '') === params.todayKey) return false
  return true
}

/**
 * Challenge briefing slot-3 earn/pending line.
 * Null when ring is not available today (caller may show badge instead).
 */
export function buildChallengeBriefingCoinLine(
  params: ChallengeBriefingCoinLineParams
): string | null {
  if (
    !canShowChallengeBriefingCoinLine({
      tier: params.tier,
      ringCount: params.ringCount,
      lastQualifyingDayKey: params.lastQualifyingDayKey,
      todayKey: params.todayKey,
    })
  ) {
    return null
  }

  const { audience } = params
  const cups = cupsOn(params.cupsEnabled)
  const rings = Math.max(0, Math.min(PRACTICE_RING_MAX, Math.floor(params.ringCount)))

  if (params.pendingPracticeCoins > 0 || params.pendingCup) {
    return byAudience(
      audience,
      '🪙 Монеты ждут золото в уроке.',
      '🪙 Монеты ждут золотую медаль урока.'
    )
  }

  if (params.tier === 1) {
    return byAudience(
      audience,
      '🪙 Зачёты копятся; монеты — после золота.',
      '🪙 Зачёты копятся; монеты — после золота урока.'
    )
  }

  // tier >= 2
  if (rings <= 1) {
    return byAudience(
      audience,
      '🪙 Монеты: 3-й зачёт +1 · 5-й +2.',
      '🪙 Монеты: 3-й зачёт +1 · 5-й +2.'
    )
  }
  if (rings === 2) {
    return byAudience(
      audience,
      '🪙 Если 11/12 — +1 монета (3-й зачёт).',
      '🪙 Если 11/12 — +1 монета (3-й зачёт).'
    )
  }
  if (rings === 3) {
    return byAudience(
      audience,
      '🪙 До +2 ещё 2 зачёта (5-й).',
      '🪙 До +2 ещё 2 зачёта (5-й).'
    )
  }
  // rings === 4
  return cups
    ? byAudience(
        audience,
        '🪙 Если 11/12 — +2 монеты и кубок.',
        '🪙 Если 11/12 — +2 монеты и кубок.'
      )
    : byAudience(
        audience,
        '🪙 Если 11/12 — +2 монеты (5-й зачёт).',
        '🪙 Если 11/12 — +2 монеты (5-й зачёт).'
      )
}
