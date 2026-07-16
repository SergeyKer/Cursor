import { describe, expect, it } from 'vitest'
import {
  hasAnyLearningHistory,
  resolveReturningHomeMenuView,
  shouldOpenMyPlanHome,
} from '@/lib/myPlan/returningHome'

describe('returningHome', () => {
  it('detects history from activity or progress or signals', () => {
    expect(hasAnyLearningHistory({ lastActiveDate: '2026-07-01', lessonProgressCount: 0, signalCount: 0 })).toBe(
      true
    )
    expect(hasAnyLearningHistory({ lastActiveDate: null, lessonProgressCount: 2, signalCount: 0 })).toBe(true)
    expect(hasAnyLearningHistory({ lastActiveDate: null, lessonProgressCount: 0, signalCount: 1 })).toBe(true)
    expect(hasAnyLearningHistory({ lastActiveDate: null, lessonProgressCount: 0, signalCount: 0 })).toBe(false)
  })

  it('bridge intents open chat or lessons only', () => {
    expect(resolveReturningHomeMenuView({ branchIntent: 'chat' })).toBe('aiChat')
    expect(resolveReturningHomeMenuView({ branchIntent: 'hub' })).toBe('lessons')
    expect(resolveReturningHomeMenuView({ branchIntent: null })).toBeNull()
  })

  it('myPlan opens after audience on start screen, not on hydrate', () => {
    expect(
      shouldOpenMyPlanHome({
        myPlanHomeEnabled: true,
        hasAnyHistory: true,
      })
    ).toBe(true)
    expect(
      shouldOpenMyPlanHome({
        myPlanHomeEnabled: false,
        hasAnyHistory: true,
      })
    ).toBe(false)
    expect(resolveReturningHomeMenuView({ branchIntent: null })).toBeNull()
  })
})
