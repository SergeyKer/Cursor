import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import { featureFlags } from '@/lib/featureFlags'

export type PracticeGemsResult = {
  awarded: number
  gemsPending: boolean
}

export function resolvePracticeGems(params: {
  tier: PracticeEconomyTier
  progress: PracticeTopicProgress
  ringIncremented: boolean
}): PracticeGemsResult {
  if (!featureFlags.practiceGemsV1) {
    return { awarded: 0, gemsPending: params.progress.gemsPending }
  }

  if (params.tier !== 2) {
    return { awarded: 0, gemsPending: false }
  }

  if (params.progress.gemsClaimed) {
    return { awarded: 0, gemsPending: false }
  }

  if (params.ringIncremented && params.progress.ringCount >= 5) {
    return { awarded: 1, gemsPending: false }
  }

  return { awarded: 0, gemsPending: params.progress.gemsPending }
}

export function applyPracticeGemsProgress(
  progress: PracticeTopicProgress,
  gemsResult: PracticeGemsResult
): PracticeTopicProgress {
  if (gemsResult.awarded > 0) {
    return { ...progress, gemsClaimed: true, gemsPending: false }
  }
  return progress
}
