import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import { featureFlags } from '@/lib/featureFlags'

export type TopicCupResult = {
  awarded: number
}

export function resolveTopicCup(params: {
  tier: PracticeEconomyTier
  progress: PracticeTopicProgress
  ringIncremented: boolean
}): TopicCupResult {
  if (!featureFlags.practiceTopicCupsV1) {
    return { awarded: 0 }
  }

  if (params.tier !== 2) {
    return { awarded: 0 }
  }

  if (params.progress.cupClaimed) {
    return { awarded: 0 }
  }

  if (params.ringIncremented && params.progress.ringCount >= 5) {
    return { awarded: 1 }
  }

  return { awarded: 0 }
}

export function applyTopicCupProgress(
  progress: PracticeTopicProgress,
  cupResult: TopicCupResult
): PracticeTopicProgress {
  if (cupResult.awarded > 0) {
    return { ...progress, cupClaimed: true }
  }
  return progress
}
