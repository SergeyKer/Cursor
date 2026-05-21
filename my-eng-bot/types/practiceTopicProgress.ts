export type PracticeTopicProgress = {
  lessonId: string
  /** Счётчик 🔁 1–5 за тему (lifetime) */
  ringCount: number
  globalRewardedCompletions: number
  consolidationSlotsFilled: number
  ringCompleted: boolean
  ringBonusClaimed: boolean
  gemsClaimed: boolean
  gemsPending: boolean
  rewardedFingerprints: string[]
  localFingerprintsIn7d: { fingerprint: string; at: number }[]
  slotScores: number[]
  bestScorePercent: number
  lastPracticeAt: number
  lastRewardedSessionId?: string
  returnAwardUsedAt?: number
  milestones?: { balanced?: boolean; challenge?: boolean }
}

export function createEmptyPracticeTopicProgress(lessonId: string): PracticeTopicProgress {
  return {
    lessonId,
    ringCount: 0,
    globalRewardedCompletions: 0,
    consolidationSlotsFilled: 0,
    ringCompleted: false,
    ringBonusClaimed: false,
    gemsClaimed: false,
    gemsPending: false,
    rewardedFingerprints: [],
    localFingerprintsIn7d: [],
    slotScores: [],
    bestScorePercent: 0,
    lastPracticeAt: 0,
  }
}
