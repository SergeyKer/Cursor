import type { PracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeGlobalXpResult } from '@/lib/practice/practiceGlobalXpAward'
import { computeRingBonusXp } from '@/lib/practice/practiceGlobalXpAward'

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
  fingerprint: string
  scorePercent: number
  sessionId: string
  ringBonusXp?: number
  now?: number
}): PracticeTopicProgress {
  const now = params.now ?? Date.now()
  const { progress, globalResult, fingerprint, scorePercent, sessionId } = params

  let next: PracticeTopicProgress = {
    ...progress,
    localFingerprintsIn7d: pruneLocalFingerprints(progress.localFingerprintsIn7d, now),
    bestScorePercent: Math.max(progress.bestScorePercent, scorePercent),
    lastPracticeAt: now,
    lastRewardedSessionId: sessionId,
  }

  if (globalResult.ringIncrement && next.ringCount < 5) {
    next = {
      ...next,
      ringCount: next.ringCount + 1,
      ringCompleted: next.ringCount + 1 >= 5,
    }
  }

  if (globalResult.amount <= 0) {
    return next
  }

  next = {
    ...next,
    globalRewardedCompletions: progress.globalRewardedCompletions + 1,
  }

  if (globalResult.isNewFingerprint && !progress.rewardedFingerprints.includes(fingerprint)) {
    next = {
      ...next,
      rewardedFingerprints: [...progress.rewardedFingerprints, fingerprint],
      localFingerprintsIn7d: [...next.localFingerprintsIn7d, { fingerprint, at: now }],
    }
  }

  if (globalResult.slotIndex !== null) {
    const slots = [...progress.slotScores]
    while (slots.length <= globalResult.slotIndex) slots.push(0)
    slots[globalResult.slotIndex] = scorePercent
    next = {
      ...next,
      slotScores: slots,
      consolidationSlotsFilled: Math.max(progress.consolidationSlotsFilled, globalResult.slotIndex + 1),
    }
  }

  if (globalResult.reason === 'return_bonus') {
    next = { ...next, returnAwardUsedAt: now }
  }

  if (
    next.ringCount >= 5 &&
    !progress.ringBonusClaimed &&
    globalResult.slotIndex === 4
  ) {
    const avgScore =
      next.slotScores.length > 0
        ? next.slotScores.reduce((sum, s) => sum + s, 0) / next.slotScores.length
        : scorePercent
    const bonus = params.ringBonusXp ?? computeRingBonusXp(avgScore)
    if (bonus > 0) {
      next = { ...next, ringBonusClaimed: true }
    }
  }

  return next
}
