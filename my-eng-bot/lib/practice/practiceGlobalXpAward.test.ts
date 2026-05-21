import { describe, expect, it } from 'vitest'
import { resolvePracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import {
  computePracticeBaseGlobalXp,
  computeRingBonusXp,
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

  it('ring bonus clamp', () => {
    expect(computeRingBonusXp(50)).toBe(28)
    expect(computeRingBonusXp(90)).toBe(45)
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
        sessionXp: 50,
        scorePercent: 80,
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
        sessionXp: 50,
        scorePercent: 80,
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
        sessionXp: 50,
        scorePercent: 40,
        fingerprint: 'fp1',
        progress: baseProgress,
        practiceGlobalXpToday: 0,
        now,
      }).reason
    ).toBe('score_below_50')
  })

  it('awards first slot on new fingerprint', () => {
    const result = resolvePracticeGlobalXp({
      tier: 1,
      mode: 'balanced',
      sessionXp: 60,
      scorePercent: 80,
      fingerprint: 'fp1',
      progress: baseProgress,
      practiceGlobalXpToday: 0,
      now,
    })
    expect(result.amount).toBeGreaterThan(0)
    expect(result.reason).toBe('new_fingerprint_slot')
    expect(result.slotIndex).toBe(0)
    expect(result.ringIncrement).toBe(true)
  })

  it('repeat tier after cap of unique fingerprints', () => {
    const progress = {
      ...baseProgress,
      rewardedFingerprints: ['fp1'],
      globalRewardedCompletions: 5,
      consolidationSlotsFilled: 5,
    }
    const result = resolvePracticeGlobalXp({
      tier: 1,
      mode: 'balanced',
      sessionXp: 60,
      scorePercent: 80,
      fingerprint: 'fp1',
      progress,
      practiceGlobalXpToday: 0,
      now,
    })
    expect(result.reason).toBe('repeat_tier')
    expect(result.amount).toBeGreaterThan(0)
  })
})
