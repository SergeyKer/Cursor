import type { PracticeMode } from '@/types/practice'

export type PracticeXpModeLane = {
  slotsFilled: number
  rewardedFingerprints: string[]
  slotScores: number[]
}

export type PracticeTopicProgress = {
  lessonId: string
  economyVersion: number
  lastQualifyingDayKey: string | null
  /** Счётчик практик (📝) 1–5 за тему (lifetime) */
  ringCount: number
  globalRewardedCompletions: number
  consolidationSlotsFilled: number
  ringCompleted: boolean
  ringBonusClaimed: boolean
  gemsClaimed: boolean
  gemsPending: boolean
  /** Тема сдана: 🥇 в профиле + 5 практик */
  cupClaimed: boolean
  rewardedFingerprints: string[]
  localFingerprintsIn7d: { fingerprint: string; at: number }[]
  slotScores: number[]
  bestScorePercent: number
  lastPracticeAt: number
  lastRewardedSessionId?: string
  returnAwardUsedAt?: number
  milestones?: { balanced?: boolean; challenge?: boolean }
  xpByMode?: Partial<Record<PracticeMode, PracticeXpModeLane>>
  baseBadgeClaimedAt?: number
  pendingPracticeCoins?: number
  pendingCup?: boolean
}

export function createEmptyPracticeTopicProgress(lessonId: string): PracticeTopicProgress {
  return {
    lessonId,
    economyVersion: 2,
    lastQualifyingDayKey: null,
    ringCount: 0,
    globalRewardedCompletions: 0,
    consolidationSlotsFilled: 0,
    ringCompleted: false,
    ringBonusClaimed: false,
    gemsClaimed: false,
    gemsPending: false,
    cupClaimed: false,
    rewardedFingerprints: [],
    localFingerprintsIn7d: [],
    slotScores: [],
    bestScorePercent: 0,
    lastPracticeAt: 0,
    xpByMode: {},
    pendingPracticeCoins: 0,
    pendingCup: false,
  }
}
