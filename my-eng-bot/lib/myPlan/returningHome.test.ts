import { describe, expect, it } from 'vitest'
import { hasAnyLearningHistory, resolveReturningHomeMenuView } from '@/lib/myPlan/returningHome'

describe('returningHome', () => {
  it('detects history from activity or progress or signals', () => {
    expect(hasAnyLearningHistory({ lastActiveDate: '2026-07-01', lessonProgressCount: 0, signalCount: 0 })).toBe(
      true
    )
    expect(hasAnyLearningHistory({ lastActiveDate: null, lessonProgressCount: 2, signalCount: 0 })).toBe(true)
    expect(hasAnyLearningHistory({ lastActiveDate: null, lessonProgressCount: 0, signalCount: 1 })).toBe(true)
    expect(hasAnyLearningHistory({ lastActiveDate: null, lessonProgressCount: 0, signalCount: 0 })).toBe(false)
  })

  it('prefers bridge intents over myPlan', () => {
    expect(
      resolveReturningHomeMenuView({
        myPlanHomeEnabled: true,
        hasAnyHistory: true,
        branchIntent: 'chat',
      })
    ).toBe('aiChat')
    expect(
      resolveReturningHomeMenuView({
        myPlanHomeEnabled: true,
        hasAnyHistory: true,
        branchIntent: 'hub',
      })
    ).toBe('lessons')
  })

  it('opens myPlan for returning users when enabled', () => {
    expect(
      resolveReturningHomeMenuView({
        myPlanHomeEnabled: true,
        hasAnyHistory: true,
        branchIntent: null,
      })
    ).toBe('myPlan')
    expect(
      resolveReturningHomeMenuView({
        myPlanHomeEnabled: false,
        hasAnyHistory: true,
        branchIntent: null,
      })
    ).toBeNull()
  })
})
