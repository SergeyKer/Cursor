import type { PracticeCompletionReward } from '@/lib/practice/practiceCompletionRewards'
import type { PracticeRewardUi } from '@/lib/practice/practiceRewardUi'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import {
  PRACTICE_RING3_COINS,
  PRACTICE_RING5_COINS,
  practiceMilestoneKey,
} from '@/lib/practice/practiceEconomyRules'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'

export type PracticeCoinMilestoneAward = {
  key: string
  amount: number
}

export type PracticeCompletionOutcome = {
  reward: PracticeCompletionReward
  rewardUi: PracticeRewardUi
  globalXpToAward: number
  /** Kept for callers that still read the legacy field; v2 never awards it. */
  ringBonusXp: 0
  activityNeeded: boolean
  coinsAwarded: number
  coinMilestones: PracticeCoinMilestoneAward[]
  masteryScore: number
  effectiveMasteryScore: number
  correctedCount: number
  plannedLength: number
  forgivenessUsed: boolean
  baseBadgeAwarded: boolean
  duplicate: boolean
}

export function resolvePracticeMilestoneOutcome(params: {
  previousProgress: PracticeTopicProgress
  progress: PracticeTopicProgress
  tier: PracticeEconomyTier
  ringIncremented: boolean
  cupEnabled: boolean
}): {
  progress: PracticeTopicProgress
  coinsAwarded: number
  coinMilestones: PracticeCoinMilestoneAward[]
  cupAwarded: number
} {
  const { previousProgress, tier, ringIncremented, cupEnabled } = params
  let progress = params.progress
  const reachedRing3 = ringIncremented && previousProgress.ringCount < 3 && progress.ringCount >= 3
  const reachedRing5 = ringIncremented && previousProgress.ringCount < 5 && progress.ringCount >= 5

  if (tier < 2) {
    const pendingCoins =
      (progress.pendingPracticeCoins ?? 0) +
      (reachedRing3 ? PRACTICE_RING3_COINS : 0) +
      (reachedRing5 ? PRACTICE_RING5_COINS : 0)
    progress = {
      ...progress,
      pendingPracticeCoins: pendingCoins,
      pendingCup: Boolean(progress.pendingCup) || reachedRing5,
    }
    return { progress, coinsAwarded: 0, coinMilestones: [], cupAwarded: 0 }
  }

  const coinMilestones: PracticeCoinMilestoneAward[] = []
  const pendingCoins = Math.max(0, progress.pendingPracticeCoins ?? 0)
  const pendingRing3 =
    (pendingCoins === PRACTICE_RING3_COINS ||
      pendingCoins >= PRACTICE_RING3_COINS + PRACTICE_RING5_COINS) &&
    progress.ringCount >= 3
  if (reachedRing3 || pendingRing3) {
    coinMilestones.push({
      key: practiceMilestoneKey(progress.lessonId, 'ring3'),
      amount: PRACTICE_RING3_COINS,
    })
  }
  if (
    reachedRing5 ||
    (pendingCoins - (pendingRing3 ? PRACTICE_RING3_COINS : 0) >= PRACTICE_RING5_COINS &&
      progress.ringCount >= 5)
  ) {
    coinMilestones.push({
      key: practiceMilestoneKey(progress.lessonId, 'ring5'),
      amount: PRACTICE_RING5_COINS,
    })
  }

  const cupAwarded =
    cupEnabled &&
    !progress.cupClaimed &&
    (reachedRing5 || (Boolean(progress.pendingCup) && progress.ringCount >= 5))
      ? 1
      : 0
  progress = {
    ...progress,
    pendingPracticeCoins: coinMilestones.length > 0 ? 0 : pendingCoins,
    pendingCup: cupAwarded > 0 ? false : Boolean(progress.pendingCup),
    cupClaimed: progress.cupClaimed || cupAwarded > 0,
  }

  return {
    progress,
    coinsAwarded: coinMilestones.reduce((sum, award) => sum + award.amount, 0),
    coinMilestones,
    cupAwarded,
  }
}
