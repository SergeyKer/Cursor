import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeGlobalXpResult } from '@/lib/practice/practiceGlobalXpAward'
import type { PracticeMode } from '@/types/practice'
import { PRACTICE_ECONOMY_VERSION, PRACTICE_RING_MAX } from '@/lib/practice/practiceEconomyRules'

function pruneLocalFingerprints(
  entries: PracticeTopicProgress['localFingerprintsIn7d'],
  now: number
): PracticeTopicProgress['localFingerprintsIn7d'] {
  const windowMs = 7 * 24 * 60 * 60 * 1000
  return entries.filter((entry) => now - entry.at <= windowMs)
}

export function applyPracticeProgressAfterCompletion(params: {
  progress: PracticeTopicProgress
  globalResult: PracticeGlobalXpResult
  mode: PracticeMode
  fingerprint: string
  masteryPercent: number
  sessionId: string
  ringIncrement: boolean
  qualifyingDayKey: string
  now?: number
}): PracticeTopicProgress {
  const now = params.now ?? Date.now()
  const { progress, globalResult, mode, fingerprint, masteryPercent, sessionId } = params

  if (progress.lastRewardedSessionId === sessionId) return progress

  const existingLane = progress.xpByMode?.[mode] ?? {
    slotsFilled: 0,
    rewardedFingerprints: [],
    slotScores: [],
  }

  let next: PracticeTopicProgress = {
    ...progress,
    economyVersion: PRACTICE_ECONOMY_VERSION,
    localFingerprintsIn7d: pruneLocalFingerprints(progress.localFingerprintsIn7d, now),
    bestScorePercent: Math.max(progress.bestScorePercent, masteryPercent),
    lastPracticeAt: now,
    lastRewardedSessionId: sessionId,
  }

  if (params.ringIncrement && next.ringCount < PRACTICE_RING_MAX) {
    const ringCount = next.ringCount + 1
    next = {
      ...next,
      ringCount,
      ringCompleted: ringCount >= PRACTICE_RING_MAX,
      lastQualifyingDayKey: params.qualifyingDayKey,
    }
  }

  if (globalResult.amount <= 0) {
    return next
  }

  next = {
    ...next,
    globalRewardedCompletions: progress.globalRewardedCompletions + 1,
  }

  let nextLane = existingLane
  if (globalResult.isNewFingerprint && !existingLane.rewardedFingerprints.includes(fingerprint)) {
    nextLane = {
      ...nextLane,
      rewardedFingerprints: [...existingLane.rewardedFingerprints, fingerprint],
    }
    next = {
      ...next,
      rewardedFingerprints: progress.rewardedFingerprints.includes(fingerprint)
        ? progress.rewardedFingerprints
        : [...progress.rewardedFingerprints, fingerprint],
      localFingerprintsIn7d: [...next.localFingerprintsIn7d, { fingerprint, at: now }],
    }
  }

  if (globalResult.slotIndex !== null) {
    const slots = [...progress.slotScores]
    const laneSlots = [...nextLane.slotScores]
    while (slots.length <= globalResult.slotIndex) slots.push(0)
    while (laneSlots.length <= globalResult.slotIndex) laneSlots.push(0)
    slots[globalResult.slotIndex] = masteryPercent
    laneSlots[globalResult.slotIndex] = masteryPercent
    nextLane = {
      ...nextLane,
      slotScores: laneSlots,
      slotsFilled: Math.max(nextLane.slotsFilled, globalResult.slotIndex + 1),
    }
    next = {
      ...next,
      slotScores: slots,
      consolidationSlotsFilled: Math.max(progress.consolidationSlotsFilled, globalResult.slotIndex + 1),
    }
  }

  next = {
    ...next,
    xpByMode: {
      ...next.xpByMode,
      [mode]: nextLane,
    },
  }

  if (globalResult.reason === 'return_bonus') {
    next = { ...next, returnAwardUsedAt: now }
  }

  return next
}
