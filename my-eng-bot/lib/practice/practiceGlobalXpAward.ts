import type { PracticeMode } from '@/types/practice'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'

export type PracticeGlobalXpReason =
  | 'tier0_session_only'
  | 'reference_mode'
  | 'score_below_50'
  | 'global_cap_reached'
  | 'daily_cap_reached'
  | 'same_fingerprint_repeat'
  | 'return_bonus'
  | 'new_fingerprint_slot'
  | 'repeat_tier'
  | 'no_eligible_award'

export type PracticeGlobalXpResult = {
  amount: number
  reason: PracticeGlobalXpReason
  slotIndex: number | null
  isNewFingerprint: boolean
  ringIncrement: boolean
}

const SLOT_MULTIPLIERS = [1.0, 0.85, 0.7, 0.55, 0.4] as const
const REPEAT_TIER_MULTIPLIER = 0.25
const GLOBAL_COMPLETION_CAP = 10
const DAILY_GLOBAL_XP_CAP = 70
const RETURN_BONUS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
const FINGERPRINT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const MAX_LOCAL_FINGERPRINTS_IN_7D = 2

function modeWeight(mode: PracticeMode): number {
  if (mode === 'reference') return 0
  if (mode === 'relaxed') return 0.55
  if (mode === 'balanced') return 1.0
  return 1.15
}

export function qualityFactor(scorePercent: number): number {
  if (scorePercent < 50) return 0
  if (scorePercent < 70) return 0.5
  if (scorePercent < 90) return 1.0
  return 1.15
}

export function computePracticeBaseGlobalXp(sessionXp: number): number {
  return Math.max(8, Math.min(28, Math.round(sessionXp * 0.45)))
}

export function computeRingBonusXp(avgScorePercent: number): number {
  return Math.max(28, Math.min(45, Math.round(35 + (avgScorePercent - 70) * 0.5)))
}

function computeSlotAmount(base: number, slotIndex: number, mode: PracticeMode, scorePercent: number): number {
  const slotMultiplier = SLOT_MULTIPLIERS[Math.min(slotIndex, SLOT_MULTIPLIERS.length - 1)] ?? 0.4
  const raw = base * slotMultiplier * modeWeight(mode) * qualityFactor(scorePercent)
  return Math.max(0, Math.round(raw))
}

function computeRepeatAmount(base: number, mode: PracticeMode, scorePercent: number): number {
  const raw = base * REPEAT_TIER_MULTIPLIER * modeWeight(mode) * qualityFactor(scorePercent)
  return Math.max(0, Math.round(raw))
}

function pruneLocalFingerprints(
  entries: PracticeTopicProgress['localFingerprintsIn7d'],
  now: number
): PracticeTopicProgress['localFingerprintsIn7d'] {
  return entries.filter((entry) => now - entry.at <= FINGERPRINT_WINDOW_MS)
}

function countLocalFingerprintsInWindow(
  entries: PracticeTopicProgress['localFingerprintsIn7d'],
  fingerprint: string,
  now: number
): number {
  return pruneLocalFingerprints(entries, now).filter((entry) => entry.fingerprint === fingerprint).length
}

export function resolvePracticeGlobalXp(params: {
  tier: PracticeEconomyTier
  mode: PracticeMode
  sessionXp: number
  scorePercent: number
  fingerprint: string
  progress: PracticeTopicProgress
  practiceGlobalXpToday: number
  now?: number
}): PracticeGlobalXpResult {
  const now = params.now ?? Date.now()
  const { tier, mode, sessionXp, scorePercent, fingerprint, progress, practiceGlobalXpToday } = params

  if (tier === 0) {
    return { amount: 0, reason: 'tier0_session_only', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  if (mode === 'reference') {
    return { amount: 0, reason: 'reference_mode', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  if (scorePercent < 50) {
    return { amount: 0, reason: 'score_below_50', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  if (progress.globalRewardedCompletions >= GLOBAL_COMPLETION_CAP) {
    return { amount: 0, reason: 'global_cap_reached', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  const remainingDaily = DAILY_GLOBAL_XP_CAP - Math.max(0, practiceGlobalXpToday)
  if (remainingDaily <= 0) {
    return { amount: 0, reason: 'daily_cap_reached', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  const base = computePracticeBaseGlobalXp(sessionXp)
  const alreadyRewardedFingerprint = progress.rewardedFingerprints.includes(fingerprint)
  const localCount = countLocalFingerprintsInWindow(progress.localFingerprintsIn7d, fingerprint, now)
  const isNewFingerprint = !alreadyRewardedFingerprint && localCount < MAX_LOCAL_FINGERPRINTS_IN_7D

  if (alreadyRewardedFingerprint || localCount >= MAX_LOCAL_FINGERPRINTS_IN_7D) {
    const repeatAmount = Math.min(computeRepeatAmount(base, mode, scorePercent), remainingDaily)
    if (repeatAmount > 0) {
      return {
        amount: repeatAmount,
        reason: 'repeat_tier',
        slotIndex: null,
        isNewFingerprint: false,
        ringIncrement: true,
      }
    }
    return { amount: 0, reason: 'same_fingerprint_repeat', slotIndex: null, isNewFingerprint: false, ringIncrement: true }
  }

  const daysSinceLast =
    progress.lastPracticeAt > 0 ? now - progress.lastPracticeAt : 0
  const returnEligible =
    progress.lastPracticeAt > 0 &&
    daysSinceLast >= RETURN_BONUS_WINDOW_MS &&
    (!progress.returnAwardUsedAt || now - progress.returnAwardUsedAt > RETURN_BONUS_WINDOW_MS)

  if (returnEligible && progress.consolidationSlotsFilled < SLOT_MULTIPLIERS.length) {
    const slotIndex = progress.consolidationSlotsFilled
    const amount = Math.min(computeSlotAmount(base, slotIndex, mode, scorePercent), remainingDaily)
    if (amount > 0) {
      return {
        amount,
        reason: 'return_bonus',
        slotIndex,
        isNewFingerprint: true,
        ringIncrement: true,
      }
    }
  }

  if (isNewFingerprint && progress.consolidationSlotsFilled < SLOT_MULTIPLIERS.length) {
    const slotIndex = progress.consolidationSlotsFilled
    const amount = Math.min(computeSlotAmount(base, slotIndex, mode, scorePercent), remainingDaily)
    if (amount > 0) {
      return {
        amount,
        reason: 'new_fingerprint_slot',
        slotIndex,
        isNewFingerprint: true,
        ringIncrement: true,
      }
    }
  }

  if (progress.globalRewardedCompletions >= 5) {
    const repeatAmount = Math.min(computeRepeatAmount(base, mode, scorePercent), remainingDaily)
    if (repeatAmount > 0) {
      return {
        amount: repeatAmount,
        reason: 'repeat_tier',
        slotIndex: null,
        isNewFingerprint: false,
        ringIncrement: true,
      }
    }
  }

  return { amount: 0, reason: 'no_eligible_award', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
}
