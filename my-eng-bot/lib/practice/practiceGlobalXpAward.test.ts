import { describe, expect, it } from 'vitest'
import { resolvePracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import {
  computePracticeBaseGlobalXp,
  qualityFactor,
  resolvePracticeGlobalXp,
} from '@/lib/practice/practiceGlobalXpAward'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'

describe('resolvePracticeEconomyTier', () => {
  it('returns tier 0 without medal', () => {
    expect(resolvePracticeEconomyTier(null)).toBe(0)
    expect(resolvePracticeEconomyTier(undefined)).toBe(0)
  })
  it('returns tier 2 for gold', () => {
    expect(resolvePracticeEconomyTier('gold')).toBe(2)
  })
  it('returns tier 1 for bronze/silver', () => {
    expect(resolvePracticeEconomyTier('bronze')).toBe(1)
    expect(resolvePracticeEconomyTier('silver')).toBe(1)
  })
})

describe('practiceGlobalXp formulas', () => {
  it('clamps base xp', () => {
    expect(computePracticeBaseGlobalXp(10)).toBe(8)
    expect(computePracticeBaseGlobalXp(100)).toBe(28)
    expect(computePracticeBaseGlobalXp(40)).toBe(18)
  })

  it('quality factor tiers', () => {
    expect(qualityFactor(40)).toBe(0)
    expect(qualityFactor(60)).toBe(0.5)
    expect(qualityFactor(80)).toBe(1)
    expect(qualityFactor(95)).toBe(1.15)
  })
})

describe('resolvePracticeGlobalXp', () => {
  const baseProgress = createEmptyPracticeTopicProgress('lesson-1')
  const now = Date.now()

  it('tier 0 gives session only reason', () => {
    expect(
      resolvePracticeGlobalXp({
        tier: 0,
        mode: 'balanced',
        firstTrySessionXp: 50,
        masteryPercent: 80,
        fingerprint: 'fp1',
        progress: baseProgress,
        practiceGlobalXpToday: 0,
        now,
      }).reason
    ).toBe('tier0_session_only')
  })

  it('reference mode gives zero global', () => {
    expect(
      resolvePracticeGlobalXp({
        tier: 1,
        mode: 'reference',
        firstTrySessionXp: 50,
        masteryPercent: 80,
        fingerprint: 'fp1',
        progress: baseProgress,
        practiceGlobalXpToday: 0,
        now,
      }).reason
    ).toBe('reference_mode')
  })

  it('score below 50 gives zero', () => {
    expect(
      resolvePracticeGlobalXp({
        tier: 1,
        mode: 'balanced',
        firstTrySessionXp: 50,
        masteryPercent: 40,
        fingerprint: 'fp1',
        progress: baseProgress,
        practiceGlobalXpToday: 0,
        now,
      }).reason
    ).toBe('mastery_below_50')
  })

  it('awards first slot on new fingerprint', () => {
    const result = resolvePracticeGlobalXp({
      tier: 1,
      mode: 'balanced',
      firstTrySessionXp: 60,
      masteryPercent: 80,
      fingerprint: 'fp1',
      progress: baseProgress,
      practiceGlobalXpToday: 0,
      now,
    })
    expect(result.amount).toBeGreaterThan(0)
    expect(result.reason).toBe('new_fingerprint_slot')
    expect(result.slotIndex).toBe(0)
    expect(result.ringIncrement).toBe(false)
  })

  it('repeat tier after cap of unique fingerprints', () => {
    const progress = {
      ...baseProgress,
      xpByMode: {
        balanced: {
          rewardedFingerprints: ['fp1'],
          slotsFilled: 5,
          slotScores: [80, 80, 80, 80, 80],
        },
      },
      globalRewardedCompletions: 5,
      consolidationSlotsFilled: 5,
    }
    const result = resolvePracticeGlobalXp({
      tier: 1,
      mode: 'balanced',
      firstTrySessionXp: 60,
      masteryPercent: 80,
      fingerprint: 'fp1',
      progress,
      practiceGlobalXpToday: 0,
      now,
    })
    expect(result.reason).toBe('repeat_tier')
    expect(result.amount).toBeGreaterThan(0)
    expect(result.ringIncrement).toBe(false)
  })

  it('uses first-try XP and mastery instead of corrected session totals', () => {
    const correctedFarm = resolvePracticeGlobalXp({
      tier: 1,
      mode: 'balanced',
      firstTrySessionXp: 0,
      masteryPercent: 45,
      fingerprint: 'corrected-only',
      progress: baseProgress,
      practiceGlobalXpToday: 0,
      now,
    })
    expect(correctedFarm.amount).toBe(0)
    expect(correctedFarm.reason).toBe('mastery_below_50')

    const firstTry = resolvePracticeGlobalXp({
      tier: 1,
      mode: 'balanced',
      firstTrySessionXp: 40,
      masteryPercent: 90,
      fingerprint: 'first-try',
      progress: baseProgress,
      practiceGlobalXpToday: 0,
      now,
    })
    expect(firstTry.amount).toBe(21)
  })

  it('does not apply the old lifetime completion cap', () => {
    const result = resolvePracticeGlobalXp({
      tier: 1,
      mode: 'challenge',
      firstTrySessionXp: 40,
      masteryPercent: 90,
      fingerprint: 'fresh-after-ten',
      progress: { ...baseProgress, globalRewardedCompletions: 10 },
      practiceGlobalXpToday: 0,
      now,
    })
    expect(result.amount).toBeGreaterThan(0)
    expect(result.reason).toBe('new_fingerprint_slot')
  })
})
