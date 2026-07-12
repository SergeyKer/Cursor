import { getTodayDateString } from '@/lib/rewardsState'
import type { PracticeMode } from '@/types/practice'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'

/** Qualifying Challenge: first-try mastery threshold (11 of 12). */
export const CHALLENGE_QUALIFYING_MASTERY = 11
export const CHALLENGE_SESSION_LENGTH = 12
export const BALANCED_BASE_MASTERY = 8
export const BALANCED_SESSION_LENGTH = 9
export const PRACTICE_RING_MAX = 5
export const PRACTICE_RING3_COINS = 1
export const PRACTICE_RING5_COINS = 2
export const PRACTICE_DAILY_GLOBAL_XP_CAP = 70
export const PRACTICE_COIN_ERROR_FORGIVENESS_COST = 1
export const PRACTICE_FORGIVENESS_MIN_STEP = 5
export const PRACTICE_FORGIVENESS_MAX_STEP = 12
export const PRACTICE_ECONOMY_VERSION = 2

export function getPracticeEconomyDayKey(date: Date = new Date()): string {
  return getTodayDateString(date)
}

export function computeMasteryPercent(masteryScore: number, plannedLength: number): number {
  const total = Math.max(1, Math.floor(plannedLength))
  const score = Math.max(0, Math.floor(masteryScore))
  return Math.round((score / total) * 100)
}

export function isQualifyingChallengePass(params: {
  mode: PracticeMode
  tier: PracticeEconomyTier
  effectiveMasteryScore: number
  plannedLength?: number
}): boolean {
  if (params.mode !== 'challenge') return false
  if (params.tier <= 0) return false
  const length = params.plannedLength ?? CHALLENGE_SESSION_LENGTH
  if (length < CHALLENGE_QUALIFYING_MASTERY) return false
  return params.effectiveMasteryScore >= CHALLENGE_QUALIFYING_MASTERY
}

export function canAwardQualifyingRingToday(params: {
  lastQualifyingDayKey?: string | null
  todayKey?: string
}): boolean {
  const today = params.todayKey ?? getPracticeEconomyDayKey()
  const last = params.lastQualifyingDayKey ?? ''
  return last !== today
}

export function resolvePracticeRingIncrement(params: {
  mode: PracticeMode
  tier: PracticeEconomyTier
  effectiveMasteryScore: number
  plannedLength?: number
  ringCount: number
  lastQualifyingDayKey?: string | null
  todayKey?: string
}): boolean {
  if (params.ringCount >= PRACTICE_RING_MAX) return false
  if (
    !isQualifyingChallengePass({
      mode: params.mode,
      tier: params.tier,
      effectiveMasteryScore: params.effectiveMasteryScore,
      plannedLength: params.plannedLength,
    })
  ) {
    return false
  }
  return canAwardQualifyingRingToday({
    lastQualifyingDayKey: params.lastQualifyingDayKey,
    todayKey: params.todayKey,
  })
}

export function isPracticeForgivenessStep(stepIndex1Based: number): boolean {
  return stepIndex1Based >= PRACTICE_FORGIVENESS_MIN_STEP && stepIndex1Based <= PRACTICE_FORGIVENESS_MAX_STEP
}

export function practiceMilestoneKey(topicId: string, milestone: 'ring3' | 'ring5'): string {
  return `${topicId}:${milestone}`
}

export function isBalancedBasePass(masteryScore: number, plannedLength = BALANCED_SESSION_LENGTH): boolean {
  return plannedLength >= BALANCED_BASE_MASTERY && masteryScore >= BALANCED_BASE_MASTERY
}
