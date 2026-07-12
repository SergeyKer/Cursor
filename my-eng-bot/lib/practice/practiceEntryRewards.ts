import { featureFlags } from '@/lib/featureFlags'
import { resolvePracticeMilestoneOutcome } from '@/lib/practice/practiceCompletionOutcome'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import {
  getPracticeTopicProgress,
  savePracticeTopicProgress,
} from '@/lib/practice/practiceTopicProgressStorage'
import type { PracticeCoinMilestoneAward } from '@/lib/practice/practiceCompletionOutcome'

export type PracticeEntryRewardOutcome = {
  claimed: boolean
  coinsAwarded: number
  cupAwarded: number
  coinMilestones: PracticeCoinMilestoneAward[]
  visibleText: string | null
}

export function claimPracticeEntryRewards(params: {
  lessonId: string
  tier: PracticeEconomyTier
}): PracticeEntryRewardOutcome {
  if (params.tier < 2) {
    return {
      claimed: false,
      coinsAwarded: 0,
      cupAwarded: 0,
      coinMilestones: [],
      visibleText: null,
    }
  }
  const progress = getPracticeTopicProgress(params.lessonId)
  if ((progress.pendingPracticeCoins ?? 0) <= 0 && !progress.pendingCup) {
    return {
      claimed: false,
      coinsAwarded: 0,
      cupAwarded: 0,
      coinMilestones: [],
      visibleText: null,
    }
  }
  const resolved = resolvePracticeMilestoneOutcome({
    previousProgress: progress,
    progress,
    tier: params.tier,
    ringIncremented: false,
    cupEnabled: featureFlags.practiceTopicCupsV1,
  })
  if (resolved.coinsAwarded <= 0 && resolved.cupAwarded <= 0) {
    return {
      claimed: false,
      coinsAwarded: 0,
      cupAwarded: 0,
      coinMilestones: [],
      visibleText: null,
    }
  }
  savePracticeTopicProgress(resolved.progress)
  const parts = ['Награда дождалась золотой медали']
  if (resolved.coinsAwarded > 0) parts.push(`+${resolved.coinsAwarded} 🪙`)
  if (resolved.cupAwarded > 0) parts.push('🏆 Тема сдана')
  return {
    claimed: true,
    coinsAwarded: resolved.coinsAwarded,
    cupAwarded: resolved.cupAwarded,
    coinMilestones: resolved.coinMilestones,
    visibleText: parts.join(' · '),
  }
}
