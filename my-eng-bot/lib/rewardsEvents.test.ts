import { describe, expect, it } from 'vitest'
import { applyRewardsEvent } from './rewardsEvents'
import { createDefaultRewardsState } from './rewardsState'

describe('applyRewardsEvent', () => {
  it('increments communication goal and xp on completed turn', () => {
    const state = createDefaultRewardsState()
    const next = applyRewardsEvent(state, { type: 'communication_turn_completed' })
    expect(next.modeGoals.communication.goalProgress).toBe(1)
    expect(next.progress.totalXP).toBeGreaterThanOrEqual(5)
    expect(next.ui.lastReward?.reason).toBe('communication_goal_progress')
  })

  it('awards structured lesson xp with variable amount', () => {
    const state = createDefaultRewardsState()
    const next = applyRewardsEvent(state, { type: 'lesson_xp_awarded', amount: 8 })
    expect(next.progress.totalXP).toBe(8)
    expect(next.ui.lastReward?.amount).toBe(8)
    expect(next.ui.lastReward?.reason).toBe('lesson_xp_awarded')
    expect(next.ui.footerTicker).toContain('+8 XP к уровню')
  })

  it('ignores zero lesson_xp_awarded', () => {
    const state = createDefaultRewardsState()
    const next = applyRewardsEvent(state, { type: 'lesson_xp_awarded', amount: 0 })
    expect(next.progress.totalXP).toBe(0)
    expect(next.ui.lastReward).toBeNull()
  })

  it('awards lesson completion bonus', () => {
    const state = createDefaultRewardsState()
    const next = applyRewardsEvent(state, { type: 'lesson_completed' })
    expect(next.progress.totalXP).toBe(45)
    expect(next.ui.footerTicker).toContain('Урок завершён')
    expect(next.ui.lastReward?.reason).toBe('lesson_completed')
  })

  it('marks communication goal completed on seventh turn', () => {
    let state = createDefaultRewardsState()
    for (let i = 0; i < 7; i += 1) {
      state = applyRewardsEvent(state, { type: 'communication_turn_completed' })
    }
    expect(state.modeGoals.communication.goalProgress).toBe(7)
    expect(state.modeGoals.communication.completed).toBe(true)
    expect(state.ui.lastReward?.reason).toBe('communication_goal_completed')
  })
})
