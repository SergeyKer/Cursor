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

  it('awards lesson completion bonus', () => {
    const state = createDefaultRewardsState()
    const next = applyRewardsEvent(state, { type: 'lesson_completed' })
    expect(next.progress.totalXP).toBe(45)
    expect(next.ui.footerTicker).toContain('Урок завершён')
    expect(next.ui.lastReward?.reason).toBe('lesson_completed')
  })
})
