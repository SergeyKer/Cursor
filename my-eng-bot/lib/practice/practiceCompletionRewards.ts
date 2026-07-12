import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeGlobalXpResult } from '@/lib/practice/practiceGlobalXpAward'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import { featureFlags } from '@/lib/featureFlags'
import { formatPracticeProgressText } from '@/lib/practice/practiceGlyphs'

export type PracticeCompletionReward = {
  sessionXp: number
  globalAmount: number
  globalReason: PracticeGlobalXpResult['reason'] | 'legacy_flat_30'
  ringCount: number
  ringIncremented: boolean
  coinsAwarded: number
  gemsAwarded: number
  cupAwarded: number
  tier: PracticeEconomyTier
  ticker: string
  progress: PracticeTopicProgress
}

export function buildPracticeCompletionTicker(params: {
  sessionXp: number
  globalAmount: number
  ringCount: number
  ringIncremented: boolean
  coinsAwarded: number
  tier: PracticeEconomyTier
  gemsAwarded: number
  cupAwarded: number
}): string {
  const parts: string[] = []
  if (params.globalAmount > 0) {
    parts.push(`+${params.globalAmount} к уровню`)
  } else if (params.tier === 0) {
    parts.push(`+${params.sessionXp} за сессию`)
  } else {
    parts.push('Сессия закрыта')
  }
  if (params.ringIncremented && params.ringCount > 0) {
    parts.push(formatPracticeProgressText(params.ringCount))
  }
  if (params.coinsAwarded > 0) {
    parts.push(`+${params.coinsAwarded} 🪙`)
  }
  if (params.cupAwarded > 0) {
    parts.push('Тема сдана 🏆')
  } else if (params.gemsAwarded > 0) {
    parts.push(`+${params.gemsAwarded} 💎`)
  }
  return parts.join('. ') + '.'
}

export function isLegacyPracticeEconomy(): boolean {
  return !featureFlags.practiceEconomyV1
}
