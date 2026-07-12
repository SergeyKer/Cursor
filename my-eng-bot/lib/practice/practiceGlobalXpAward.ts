import type { PracticeMode } from '@/types/practice'
import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import { PRACTICE_DAILY_GLOBAL_XP_CAP } from '@/lib/practice/practiceEconomyRules'

export type PracticeGlobalXpReason =
  | 'tier0_session_only'
  | 'reference_mode'
  | 'mastery_below_50'
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
  firstTrySessionXp: number
  masteryPercent: number
  fingerprint: string
  progress: PracticeTopicProgress
  practiceGlobalXpToday: number
  now?: number
}): PracticeGlobalXpResult {
  const now = params.now ?? Date.now()
  const {
    tier,
    mode,
    firstTrySessionXp,
    masteryPercent,
    fingerprint,
    progress,
    practiceGlobalXpToday,
  } = params

  if (tier === 0) {
    return { amount: 0, reason: 'tier0_session_only', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  if (mode === 'reference') {
    return { amount: 0, reason: 'reference_mode', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  if (masteryPercent < 50) {
    return { amount: 0, reason: 'mastery_below_50', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  const remainingDaily = PRACTICE_DAILY_GLOBAL_XP_CAP - Math.max(0, practiceGlobalXpToday)
  if (remainingDaily <= 0) {
    return { amount: 0, reason: 'daily_cap_reached', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  const base = computePracticeBaseGlobalXp(firstTrySessionXp)
  const lane = progress.xpByMode?.[mode]
  const rewardedFingerprints = lane?.rewardedFingerprints ?? []
  const slotsFilled = lane?.slotsFilled ?? 0
  const alreadyRewardedFingerprint = rewardedFingerprints.includes(fingerprint)
  const localCount = countLocalFingerprintsInWindow(progress.localFingerprintsIn7d, fingerprint, now)
  const isNewFingerprint = !alreadyRewardedFingerprint && localCount < MAX_LOCAL_FINGERPRINTS_IN_7D

  if (alreadyRewardedFingerprint || localCount >= MAX_LOCAL_FINGERPRINTS_IN_7D) {
    const repeatAmount = Math.min(computeRepeatAmount(base, mode, masteryPercent), remainingDaily)
    if (repeatAmount > 0) {
      return {
        amount: repeatAmount,
        reason: 'repeat_tier',
        slotIndex: null,
        isNewFingerprint: false,
        ringIncrement: false,
      }
    }
    return { amount: 0, reason: 'same_fingerprint_repeat', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
  }

  const daysSinceLast =
    progress.lastPracticeAt > 0 ? now - progress.lastPracticeAt : 0
  const returnEligible =
    progress.lastPracticeAt > 0 &&
    daysSinceLast >= RETURN_BONUS_WINDOW_MS &&
    (!progress.returnAwardUsedAt || now - progress.returnAwardUsedAt > RETURN_BONUS_WINDOW_MS)

  if (returnEligible && slotsFilled < SLOT_MULTIPLIERS.length) {
    const slotIndex = slotsFilled
    const amount = Math.min(computeSlotAmount(base, slotIndex, mode, masteryPercent), remainingDaily)
    if (amount > 0) {
      return {
        amount,
        reason: 'return_bonus',
        slotIndex,
        isNewFingerprint: true,
        ringIncrement: false,
      }
    }
  }

  if (isNewFingerprint && slotsFilled < SLOT_MULTIPLIERS.length) {
    const slotIndex = slotsFilled
    const amount = Math.min(computeSlotAmount(base, slotIndex, mode, masteryPercent), remainingDaily)
    if (amount > 0) {
      return {
        amount,
        reason: 'new_fingerprint_slot',
        slotIndex,
        isNewFingerprint: true,
        ringIncrement: false,
      }
    }
  }

  if (slotsFilled >= SLOT_MULTIPLIERS.length) {
    const repeatAmount = Math.min(computeRepeatAmount(base, mode, masteryPercent), remainingDaily)
    if (repeatAmount > 0) {
      return {
        amount: repeatAmount,
        reason: 'repeat_tier',
        slotIndex: null,
        isNewFingerprint: false,
        ringIncrement: false,
      }
    }
  }

  return { amount: 0, reason: 'no_eligible_award', slotIndex: null, isNewFingerprint: false, ringIncrement: false }
}
