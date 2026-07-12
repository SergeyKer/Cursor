import { describe, expect, it } from 'vitest'
import {
  BALANCED_BASE_MASTERY,
  CHALLENGE_QUALIFYING_MASTERY,
  CHALLENGE_SESSION_LENGTH,
  PRACTICE_COIN_ERROR_FORGIVENESS_COST,
  PRACTICE_DAILY_GLOBAL_XP_CAP,
  PRACTICE_RING_MAX,
  PRACTICE_RING3_COINS,
  PRACTICE_RING5_COINS,
  canAwardQualifyingRingToday,
  computeMasteryPercent,
  isBalancedBasePass,
  isPracticeForgivenessStep,
  isQualifyingChallengePass,
  practiceMilestoneKey,
  resolvePracticeRingIncrement,
} from '@/lib/practice/practiceEconomyRules'

describe('practiceEconomyRules', () => {
  it('keeps Challenge qualifying at 11/12 and ring economics', () => {
    expect(CHALLENGE_QUALIFYING_MASTERY).toBe(11)
    expect(CHALLENGE_SESSION_LENGTH).toBe(12)
    expect(PRACTICE_RING_MAX).toBe(5)
    expect(PRACTICE_RING3_COINS).toBe(1)
    expect(PRACTICE_RING5_COINS).toBe(2)
    expect(PRACTICE_DAILY_GLOBAL_XP_CAP).toBe(70)
    expect(PRACTICE_COIN_ERROR_FORGIVENESS_COST).toBe(1)
  })

  it('computes mastery percent from planned length', () => {
    expect(computeMasteryPercent(3, 12)).toBe(25)
    expect(computeMasteryPercent(6, 12)).toBe(50)
    expect(computeMasteryPercent(11, 12)).toBe(92)
  })

  it('qualifies Challenge only with tier and 11+ effective mastery', () => {
    expect(
      isQualifyingChallengePass({ mode: 'challenge', tier: 1, effectiveMasteryScore: 11 })
    ).toBe(true)
    expect(
      isQualifyingChallengePass({ mode: 'challenge', tier: 1, effectiveMasteryScore: 10 })
    ).toBe(false)
    expect(
      isQualifyingChallengePass({ mode: 'balanced', tier: 2, effectiveMasteryScore: 12 })
    ).toBe(false)
    expect(
      isQualifyingChallengePass({ mode: 'challenge', tier: 0, effectiveMasteryScore: 12 })
    ).toBe(false)
  })

  it('limits ring to one local day', () => {
    expect(canAwardQualifyingRingToday({ lastQualifyingDayKey: '2026-07-11', todayKey: '2026-07-12' })).toBe(
      true
    )
    expect(canAwardQualifyingRingToday({ lastQualifyingDayKey: '2026-07-12', todayKey: '2026-07-12' })).toBe(
      false
    )
  })

  it('resolves rings independently from XP and caps them at five', () => {
    expect(
      resolvePracticeRingIncrement({
        mode: 'challenge',
        tier: 1,
        effectiveMasteryScore: 11,
        ringCount: 2,
        lastQualifyingDayKey: '2026-07-11',
        todayKey: '2026-07-12',
      })
    ).toBe(true)
    expect(
      resolvePracticeRingIncrement({
        mode: 'challenge',
        tier: 2,
        effectiveMasteryScore: 12,
        ringCount: 5,
        todayKey: '2026-07-12',
      })
    ).toBe(false)
    expect(
      resolvePracticeRingIncrement({
        mode: 'balanced',
        tier: 2,
        effectiveMasteryScore: 12,
        ringCount: 0,
        todayKey: '2026-07-12',
      })
    ).toBe(false)
  })

  it('forgiveness steps are 5..12 and Balаnced base is 8/9', () => {
    expect(isPracticeForgivenessStep(4)).toBe(false)
    expect(isPracticeForgivenessStep(5)).toBe(true)
    expect(isPracticeForgivenessStep(12)).toBe(true)
    expect(isPracticeForgivenessStep(13)).toBe(false)
    expect(BALANCED_BASE_MASTERY).toBe(8)
    expect(isBalancedBasePass(8)).toBe(true)
    expect(isBalancedBasePass(7)).toBe(false)
    expect(practiceMilestoneKey('topic-1', 'ring3')).toBe('topic-1:ring3')
  })
})
