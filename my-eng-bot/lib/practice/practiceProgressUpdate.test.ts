import { describe, expect, it } from 'vitest'
import { applyPracticeProgressAfterCompletion } from '@/lib/practice/practiceProgressUpdate'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { PracticeGlobalXpResult } from '@/lib/practice/practiceGlobalXpAward'

const awardedResult: PracticeGlobalXpResult = {
  amount: 18,
  reason: 'new_fingerprint_slot',
  slotIndex: 0,
  isNewFingerprint: true,
  ringIncrement: false,
}

describe('applyPracticeProgressAfterCompletion', () => {
  it('tracks XP slots and fingerprints per mode while applying a separate ring result', () => {
    const progress = createEmptyPracticeTopicProgress('topic-1')
    const next = applyPracticeProgressAfterCompletion({
      progress,
      globalResult: awardedResult,
      mode: 'challenge',
      fingerprint: 'challenge-content',
      masteryPercent: 92,
      sessionId: 'session-1',
      ringIncrement: true,
      qualifyingDayKey: '2026-07-12',
      now: 100,
    })

    expect(next.ringCount).toBe(1)
    expect(next.lastQualifyingDayKey).toBe('2026-07-12')
    expect(next.xpByMode?.challenge?.slotsFilled).toBe(1)
    expect(next.xpByMode?.challenge?.rewardedFingerprints).toEqual(['challenge-content'])
    expect(next.xpByMode?.balanced).toBeUndefined()
  })

  it('is idempotent for the same completed session', () => {
    const progress = {
      ...createEmptyPracticeTopicProgress('topic-1'),
      lastRewardedSessionId: 'session-1',
      ringCount: 2,
    }
    const next = applyPracticeProgressAfterCompletion({
      progress,
      globalResult: awardedResult,
      mode: 'challenge',
      fingerprint: 'new-content',
      masteryPercent: 100,
      sessionId: 'session-1',
      ringIncrement: true,
      qualifyingDayKey: '2026-07-12',
      now: 100,
    })

    expect(next).toBe(progress)
    expect(next.ringCount).toBe(2)
  })
})
