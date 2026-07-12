import { describe, expect, it } from 'vitest'
import {
  resolveCanEarnRingToday,
  resolvePostPracticeActions,
} from '@/lib/practice/resolvePostPracticeActions'

const base = {
  mode: 'challenge' as const,
  generationSource: 'local' as const,
  tier: 2 as const,
  globalAmount: 20,
  globalReason: 'new_fingerprint_slot' as const,
  ringCount: 2,
  ringIncremented: false,
  canEarnRingToday: true,
  cupClaimed: false,
  cupAwarded: 0,
  masteryScore: 11,
  plannedLength: 12,
  hasLesson: true,
  hasTips: true,
  otherTopicAvailable: true,
  chatAvailable: true,
}

describe('resolvePostPracticeActions', () => {
  it('keeps generate primary while cup grind is open', () => {
    const result = resolvePostPracticeActions(base)
    expect(result.actions[0]?.id).toBe('generate_variant')
    expect(result.actions[0]?.label).toBe('Ещё вариант')
    expect(result.recommendation?.id).toBe('ai_conversation')
    expect(result.actions.map((a) => a.id)).not.toContain('menu')
  })

  it('uses Ещё раунд after AI session', () => {
    const result = resolvePostPracticeActions({
      ...base,
      generationSource: 'ai_generated',
    })
    expect(result.actions[0]?.label).toBe('Ещё раунд')
  })

  it('opens lesson when tier 0', () => {
    const result = resolvePostPracticeActions({
      ...base,
      tier: 0,
      canEarnRingToday: false,
      masteryScore: 3,
    })
    expect(result.actions[0]?.id).toBe('open_lesson')
  })

  it('upgrades from relaxed', () => {
    const result = resolvePostPracticeActions({
      ...base,
      mode: 'relaxed',
      canEarnRingToday: false,
      masteryScore: 5,
      plannedLength: 6,
    })
    expect(result.actions[0]?.id).toBe('upgrade_mode')
    expect(result.nextMode).toBe('balanced')
  })

  it('never returns duplicate actions and stays within 2-4', () => {
    const result = resolvePostPracticeActions({
      ...base,
      hasTips: false,
      otherTopicAvailable: false,
    })
    const ids = result.actions.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(1)
    expect(ids.length).toBeLessThanOrEqual(4)
  })

  it('hides recommendation when chat unavailable', () => {
    const result = resolvePostPracticeActions({
      ...base,
      chatAvailable: false,
    })
    expect(result.recommendation).toBeNull()
  })

  it('prefers other topic when ring blocked and cup closed', () => {
    const result = resolvePostPracticeActions({
      ...base,
      canEarnRingToday: false,
      cupClaimed: true,
      ringCount: 5,
    })
    expect(result.actions[0]?.id).toBe('other_topic')
  })
})

describe('resolveCanEarnRingToday', () => {
  it('is false after today ring', () => {
    expect(
      resolveCanEarnRingToday({
        tier: 2,
        ringCount: 2,
        lastQualifyingDayKey: '2026-07-12',
        todayKey: '2026-07-12',
      })
    ).toBe(false)
  })

  it('is true when tier>0 and not today', () => {
    expect(
      resolveCanEarnRingToday({
        tier: 1,
        ringCount: 2,
        lastQualifyingDayKey: '2026-07-11',
        todayKey: '2026-07-12',
      })
    ).toBe(true)
  })
})
