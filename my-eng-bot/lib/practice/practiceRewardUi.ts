import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeGlobalXpResult } from '@/lib/practice/practiceGlobalXpAward'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'

export type PracticeRewardUi = {
  id: string
  sessionXp: number
  globalAmount: number
  globalReason: PracticeGlobalXpResult['reason'] | 'legacy_flat_30' | 'tier0_session_only'
  ringCount: number
  ringIncremented: boolean
  gemsAwarded: number
  tier: PracticeEconomyTier
  topLine: string
  popupText: string
  showPopup: boolean
  at: number
}

export function buildPracticeRewardTopLine(params: {
  sessionXp: number
  globalAmount: number
  tier: PracticeEconomyTier
  ringCount: number
  ringIncremented: boolean
  gemsAwarded: number
  audience: 'adult' | 'child'
}): string {
  const { sessionXp, globalAmount, tier, ringCount, ringIncremented, gemsAwarded, audience } = params
  const parts: string[] = []

  if (globalAmount > 0) {
    parts.push(
      audience === 'child'
        ? `Практика готова! +${globalAmount} XP к уровню!`
        : `Практика завершена. +${globalAmount} XP к уровню.`
    )
  } else if (tier === 0) {
    parts.push(
      audience === 'child'
        ? `Супер! +${sessionXp} XP за сессию!`
        : `Сессия закрыта. +${sessionXp} XP за практику.`
    )
  } else {
    parts.push(
      audience === 'child' ? 'Практика готова! Круто закрепили!' : 'Практика закрыта. Хорошее закрепление.'
    )
  }

  if (ringIncremented && ringCount > 0) {
    parts.push(audience === 'child' ? `🔁 ${ringCount}/5 — ещё ближе!` : `🔁 ${ringCount}/5 за тему.`)
  }

  if (gemsAwarded > 0) {
    parts.push(audience === 'child' ? `+${gemsAwarded} 💎!` : `+${gemsAwarded} камней.`)
  }

  return parts.join(' ')
}

export function buildPracticeRewardPopupText(params: {
  sessionXp: number
  globalAmount: number
  tier: PracticeEconomyTier
  audience: 'adult' | 'child'
  levelUp?: { from: number; to: number } | null
}): string {
  const { sessionXp, globalAmount, tier, audience, levelUp } = params
  if (levelUp) {
    return audience === 'child'
      ? `Новый уровень ${levelUp.to}! +${globalAmount || sessionXp} XP!`
      : `Новый уровень ${levelUp.to}. +${globalAmount || sessionXp} XP.`
  }
  if (globalAmount > 0) {
    return audience === 'child'
      ? `Практика завершена! +${globalAmount} XP!`
      : `Практика завершена. +${globalAmount} XP.`
  }
  if (tier === 0) {
    return audience === 'child' ? `+${sessionXp} XP за сессию!` : `+${sessionXp} XP за сессию.`
  }
  return audience === 'child' ? 'Практика готова!' : 'Практика закрыта.'
}

export function createPracticeRewardUi(params: {
  sessionId: string
  sessionXp: number
  globalAmount: number
  globalReason: PracticeRewardUi['globalReason']
  tier: PracticeEconomyTier
  progress: PracticeTopicProgress
  ringIncremented: boolean
  gemsAwarded: number
  audience: 'adult' | 'child'
}): PracticeRewardUi {
  const topLine = buildPracticeRewardTopLine({
    sessionXp: params.sessionXp,
    globalAmount: params.globalAmount,
    tier: params.tier,
    ringCount: params.progress.ringCount,
    ringIncremented: params.ringIncremented,
    gemsAwarded: params.gemsAwarded,
    audience: params.audience,
  })
  const popupText = buildPracticeRewardPopupText({
    sessionXp: params.sessionXp,
    globalAmount: params.globalAmount,
    tier: params.tier,
    audience: params.audience,
  })
  return {
    id: params.sessionId,
    sessionXp: params.sessionXp,
    globalAmount: params.globalAmount,
    globalReason: params.globalReason,
    ringCount: params.progress.ringCount,
    ringIncremented: params.ringIncremented,
    gemsAwarded: params.gemsAwarded,
    tier: params.tier,
    topLine,
    popupText,
    showPopup: params.globalAmount > 0 || params.tier === 0 || params.gemsAwarded > 0,
    at: Date.now(),
  }
}
