import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeGlobalXpResult } from '@/lib/practice/practiceGlobalXpAward'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import { formatPracticeProgressText } from '@/lib/practice/practiceGlyphs'

export type PracticeRewardUi = {
  id: string
  sessionXp: number
  globalAmount: number
  globalReason: PracticeGlobalXpResult['reason'] | 'legacy_flat_30' | 'tier0_session_only'
  ringCount: number
  ringIncremented: boolean
  gemsAwarded: number
  cupAwarded: number
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
  cupAwarded: number
  audience: 'adult' | 'child'
}): string {
  const { sessionXp, globalAmount, tier, ringCount, ringIncremented, gemsAwarded, cupAwarded, audience } = params
  const parts: string[] = []

  if (globalAmount > 0) {
    parts.push(
      audience === 'child'
        ? `Практика готова! +${globalAmount} к уровню!`
        : `Практика завершена. +${globalAmount} к уровню.`
    )
  } else if (tier === 0) {
    parts.push(
      audience === 'child'
        ? `Супер! +${sessionXp} за сессию!`
        : `Сессия закрыта. +${sessionXp} за практику.`
    )
  } else {
    parts.push(
      audience === 'child' ? 'Практика готова! Круто закрепили!' : 'Практика закрыта. Хорошее закрепление.'
    )
  }

  if (ringIncremented && ringCount > 0) {
    const progress = formatPracticeProgressText(ringCount)
    parts.push(audience === 'child' ? `${progress} - ещё ближе!` : `${progress} за тему.`)
  }

  if (cupAwarded > 0) {
    parts.push(audience === 'child' ? 'Тема сдана! 🏆' : 'Тема сдана. Кубок 🏆')
  } else if (gemsAwarded > 0) {
    parts.push(audience === 'child' ? `+${gemsAwarded} 💎!` : `+${gemsAwarded} камней.`)
  }

  return parts[0] ?? ''
}

export function buildPracticeRewardPopupText(params: {
  sessionXp: number
  globalAmount: number
  tier: PracticeEconomyTier
  audience: 'adult' | 'child'
  cupAwarded?: number
  levelUp?: { from: number; to: number } | null
}): string {
  const { sessionXp, globalAmount, tier, audience, cupAwarded = 0, levelUp } = params
  if (cupAwarded > 0) {
    return audience === 'child' ? 'Тема сдана! 🏆' : 'Тема сдана. Кубок темы 🏆'
  }
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
  cupAwarded: number
  audience: 'adult' | 'child'
}): PracticeRewardUi {
  const topLine = buildPracticeRewardTopLine({
    sessionXp: params.sessionXp,
    globalAmount: params.globalAmount,
    tier: params.tier,
    ringCount: params.progress.ringCount,
    ringIncremented: params.ringIncremented,
    gemsAwarded: params.gemsAwarded,
    cupAwarded: params.cupAwarded,
    audience: params.audience,
  })
  const popupText = buildPracticeRewardPopupText({
    sessionXp: params.sessionXp,
    globalAmount: params.globalAmount,
    tier: params.tier,
    audience: params.audience,
    cupAwarded: params.cupAwarded,
  })
  return {
    id: params.sessionId,
    sessionXp: params.sessionXp,
    globalAmount: params.globalAmount,
    globalReason: params.globalReason,
    ringCount: params.progress.ringCount,
    ringIncremented: params.ringIncremented,
    gemsAwarded: params.gemsAwarded,
    cupAwarded: params.cupAwarded,
    tier: params.tier,
    topLine,
    popupText,
    showPopup:
      params.globalAmount > 0 ||
      params.tier === 0 ||
      params.gemsAwarded > 0 ||
      params.cupAwarded > 0,
    at: Date.now(),
  }
}
