import { describe, expect, it } from 'vitest'
import { applyRewardsEvent } from './rewardsEvents'
import { createDefaultRewardsState, getTodayDateString } from './rewardsState'

function offsetDateString(base: string, dayOffset: number): string {
  const dt = new Date(`${base}T12:00:00`)
  dt.setDate(dt.getDate() + dayOffset)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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
    expect(next.ui.footerTicker).toContain('+8 к уровню')
  })

  it('ignores zero lesson_xp_awarded', () => {
    const state = createDefaultRewardsState()
    const next = applyRewardsEvent(state, { type: 'lesson_xp_awarded', amount: 0 })
    expect(next.progress.totalXP).toBe(0)
    expect(next.ui.lastReward).toBeNull()
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

  it('awards streak bonus on first communication turn when streak reaches 3', () => {
    const today = getTodayDateString()
    const yesterday = offsetDateString(today, -1)
    let state = createDefaultRewardsState()
    state.progress.dailyStreak = 2
    state.progress.lastActiveDate = yesterday
    const next = applyRewardsEvent(state, { type: 'communication_turn_completed' })
    expect(next.progress.dailyStreak).toBe(3)
    expect(next.ui.lastReward?.amount).toBe(15)
    expect(next.ui.lastReward?.streakBonus).toBe(10)

    const again = applyRewardsEvent(next, { type: 'communication_turn_completed' })
    expect(again.ui.lastReward?.amount).toBe(5)
    expect(again.ui.lastReward?.streakBonus).toBeUndefined()
  })
})
