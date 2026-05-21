import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeGlobalXpResult } from '@/lib/practice/practiceGlobalXpAward'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import { featureFlags } from '@/lib/featureFlags'

export type PracticeCompletionReward = {
  sessionXp: number
  globalAmount: number
  globalReason: PracticeGlobalXpResult['reason'] | 'legacy_flat_30'
  ringCount: number
  ringIncremented: boolean
  gemsAwarded: number
  tier: PracticeEconomyTier
  ticker: string
  progress: PracticeTopicProgress
}

export function buildPracticeCompletionTicker(params: {
  sessionXp: number
  globalAmount: number
  ringCount: number
  ringIncremented: boolean
  tier: PracticeEconomyTier
  gemsAwarded: number
}): string {
  const parts: string[] = []
  if (params.globalAmount > 0) {
    parts.push(`+${params.globalAmount} XP к уровню`)
  } else if (params.tier === 0) {
    parts.push(`+${params.sessionXp} XP за сессию`)
  } else {
    parts.push('Сессия закрыта')
  }
  if (params.ringIncremented && params.ringCount > 0) {
    parts.push(`🔁 ${params.ringCount}/5`)
  }
  if (params.gemsAwarded > 0) {
    parts.push(`+${params.gemsAwarded} 💎`)
  }
  return parts.join('. ') + '.'
}

export function isLegacyPracticeEconomy(): boolean {
  return !featureFlags.practiceEconomyV1
}
