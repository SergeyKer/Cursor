import { describe, expect, it } from 'vitest'
import {
  appendFooterRewardSnapshot,
  awardGlobalXp,
  createDefaultRewardsState,
  reconcileModeGoalSessions,
} from './rewardsState'

describe('rewardsState', () => {
  it('marks level-up in ui when xp crosses threshold', () => {
    const state = createDefaultRewardsState()
    const next = awardGlobalXp(state, 120, 'test_xp')
    expect(next.progress.level).toBe(2)
    expect(next.ui.lastLevelUp?.from).toBe(1)
    expect(next.ui.lastLevelUp?.to).toBe(2)
  })

  it('abandons stale in-progress mode goal session', () => {
    const state = createDefaultRewardsState()
    state.modeGoals.communication = {
      ...state.modeGoals.communication,
      status: 'in_progress',
      goalProgress: 3,
      sessionStartedAt: '2026-05-01T10:00:00.000Z',
      sessionCompletedAt: null,
    }
    const next = reconcileModeGoalSessions(state, new Date('2026-05-01T11:00:00.000Z'))
    expect(next.modeGoals.communication.status).toBe('abandoned')
    expect(next.modeGoals.communication.goalProgress).toBe(0)
  })

  it('appends compact reward snapshot to footer context', () => {
    const state = createDefaultRewardsState()
    const merged = appendFooterRewardSnapshot('Диалог - Present Simple', state)
    expect(merged).toContain('Диалог - Present Simple')
    expect(merged).toContain('⭐')
    expect(merged).toContain('🔥')
  })
})
