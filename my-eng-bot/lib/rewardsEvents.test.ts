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
  it('increments communication session and xp on step', () => {
    const state = createDefaultRewardsState()
    const next = applyRewardsEvent(state, {
      type: 'communication_step_resolved',
      assistantKey: 'c:test:1',
    })
    expect(next.communicationSession.progress).toBe(1)
    expect(next.progress.totalXP).toBeGreaterThanOrEqual(2)
    expect(next.ui.lastReward?.reason).toBe('communication_step_resolved')
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

  it('marks communication session completed on eighth step', () => {
    let state = createDefaultRewardsState()
    for (let i = 0; i < 8; i += 1) {
      state = applyRewardsEvent(state, {
        type: 'communication_step_resolved',
        assistantKey: `c:test:${i}`,
      })
    }
    expect(state.communicationSession.progress).toBe(8)
    expect(state.communicationSession.status).toBe('completed')
    expect(state.modeGoals.communication.completed).toBe(true)
    expect(state.ui.lastReward?.reason).toBe('communication_session_completed')
  })

  it('records coins_spent without awarding xp', () => {
    const state = createDefaultRewardsState()
    state.currencies.coins = 4
    const next = applyRewardsEvent(state, {
      type: 'coins_spent',
      amount: 1,
      reason: 'lesson_error_forgiveness',
    })
    expect(next.currencies.coins).toBe(4)
    expect(next.progress.totalXP).toBe(0)
    expect(next.ui.lastReward?.reason).toBe('lesson_error_forgiveness')
    expect(next.ui.lastReward?.amount).toBe(0)
  })

  it('records coins_earned ui without mutating balance', () => {
    const state = createDefaultRewardsState()
    state.currencies.coins = 6
    const next = applyRewardsEvent(state, {
      type: 'coins_earned',
      amount: 1,
      reason: 'lesson_gold',
      ticker: 'Золотая медаль. +1 🪙.',
    })
    expect(next.currencies.coins).toBe(6)
    expect(next.progress.totalXP).toBe(0)
    expect(next.ui.footerTicker).toBe('Золотая медаль. +1 🪙.')
    expect(next.ui.lastReward?.reason).toBe('lesson_gold')
    expect(next.ui.lastReward?.amount).toBe(1)
  })

  it('awards streak bonus on first communication step when streak reaches 3', () => {
    const today = getTodayDateString()
    const yesterday = offsetDateString(today, -1)
    let state = createDefaultRewardsState()
    state.progress.dailyStreak = 2
    state.progress.lastActiveDate = yesterday
    const next = applyRewardsEvent(state, {
      type: 'communication_step_resolved',
      assistantKey: 'c:streak:1',
    })
    expect(next.progress.dailyStreak).toBe(3)
    expect(next.ui.lastReward?.amount).toBeGreaterThanOrEqual(2)
    expect(next.ui.lastReward?.streakBonus).toBe(10)

    const again = applyRewardsEvent(next, {
      type: 'communication_step_resolved',
      assistantKey: 'c:streak:2',
    })
    expect(again.ui.lastReward?.amount).toBe(2)
    expect(again.ui.lastReward?.streakBonus).toBeUndefined()
  })

  it('legacy communication_turn_completed does not award xp', () => {
    const state = createDefaultRewardsState()
    const next = applyRewardsEvent(state, { type: 'communication_turn_completed' })
    expect(next.communicationSession.progress).toBe(0)
    expect(next.progress.totalXP).toBe(0)
  })
})
