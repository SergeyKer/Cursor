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
      englishAttempt: true,
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
        englishAttempt: true,
      })
    }
    expect(state.communicationSession.progress).toBe(8)
    expect(state.communicationSession.status).toBe('completed')
    expect(state.modeGoals.communication.completed).toBe(true)
    expect(state.ui.lastReward?.reason).toBe('communication_session_completed')
    expect(state.communicationSession.completedAt).toBe(getTodayDateString())
    const abandoned = applyRewardsEvent(state, { type: 'communication_session_abandoned' })
    expect(abandoned.communicationSession.status).toBe('abandoned')
    expect(abandoned.communicationSession.completedAt).toBe(getTodayDateString())
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
      englishAttempt: true,
    })
    expect(next.progress.dailyStreak).toBe(3)
    expect(next.ui.lastReward?.amount).toBeGreaterThanOrEqual(2)
    expect(next.ui.lastReward?.streakBonus).toBe(10)

    const again = applyRewardsEvent(next, {
      type: 'communication_step_resolved',
      assistantKey: 'c:streak:2',
      englishAttempt: true,
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

  it('counts a Russian communication turn without step XP', () => {
    const state = createDefaultRewardsState()
    const next = applyRewardsEvent(state, {
      type: 'communication_step_resolved',
      assistantKey: 'c:ru:1',
      englishAttempt: false,
    })
    expect(next.communicationSession.progress).toBe(1)
    expect(next.communicationSession.lastStepAwardedXp).toBe(0)
    expect(next.communicationSession.englishAttemptCount).toBe(0)
    expect(next.communicationSession.sessionXpAwarded).toBe(0)
    expect(next.progress.totalXP).toBe(0)
    expect(next.progress.lastActiveDate).toBe(getTodayDateString())
  })

  it('does not award completion XP for eight Russian-only turns', () => {
    let state = createDefaultRewardsState()
    for (let i = 0; i < 8; i += 1) {
      state = applyRewardsEvent(state, {
        type: 'communication_step_resolved',
        assistantKey: `c:ru-only:${i}`,
        englishAttempt: false,
      })
    }
    expect(state.communicationSession.progress).toBe(8)
    expect(state.communicationSession.status).toBe('completed')
    expect(state.modeGoals.communication.completed).toBe(true)
    expect(state.communicationSession.sessionXpAwarded).toBe(0)
    expect(state.progress.totalXP).toBe(0)
    expect(state.ui.lastReward?.reason).toBe('communication_session_completed')
    expect(state.ui.lastReward?.amount).toBe(0)
  })

  it('awards tutor explain +1 once per canonicalKey day', () => {
    let state = createDefaultRewardsState()
    state = applyRewardsEvent(state, { type: 'tutor_explain_resolved', canonicalKey: 'pp' })
    expect(state.progress.totalXP).toBe(1)
    expect(state.tutorSession.sessionXpAwarded).toBe(1)
    expect(state.tutorSession.dailyXpAwarded).toBe(1)
    expect(state.ui.lastReward?.reason).toBe('tutor_explain_resolved')

    const dup = applyRewardsEvent(state, { type: 'tutor_explain_resolved', canonicalKey: 'pp' })
    expect(dup.progress.totalXP).toBe(1)
    expect(dup.tutorSession.sessionXpAwarded).toBe(1)
  })

  it('awards tutor micro +6 once and clamps daily cap', () => {
    let state = createDefaultRewardsState()
    state = applyRewardsEvent(state, { type: 'tutor_explain_resolved', canonicalKey: 'a' })
    state = applyRewardsEvent(state, { type: 'tutor_micro_finale_resolved', canonicalKey: 'a' })
    expect(state.progress.totalXP).toBe(7)
    expect(state.tutorSession.sessionXpAwarded).toBe(7)
    expect(state.tutorSession.dailyXpAwarded).toBe(7)

    const again = applyRewardsEvent(state, {
      type: 'tutor_micro_finale_resolved',
      canonicalKey: 'a',
    })
    expect(again.progress.totalXP).toBe(7)

    state = applyRewardsEvent(state, { type: 'tutor_explain_resolved', canonicalKey: 'b' })
    state = applyRewardsEvent(state, { type: 'tutor_micro_finale_resolved', canonicalKey: 'b' })
    expect(state.tutorSession.dailyXpAwarded).toBe(14)
    expect(state.progress.totalXP).toBe(14)

    const over = applyRewardsEvent(state, { type: 'tutor_explain_resolved', canonicalKey: 'c' })
    expect(over.progress.totalXP).toBe(14)
    expect(over.tutorSession.dailyXpAwarded).toBe(14)
  })

  it('resets tutor visit sessionXp on abandon but keeps daily keys', () => {
    let state = createDefaultRewardsState()
    state = applyRewardsEvent(state, { type: 'tutor_explain_resolved', canonicalKey: 'pp' })
    state = applyRewardsEvent(state, { type: 'tutor_session_abandoned' })
    expect(state.tutorSession.sessionXpAwarded).toBe(0)
    expect(state.tutorSession.status).toBe('abandoned')
    expect(state.tutorSession.dailyXpAwarded).toBe(1)
    expect(state.tutorSession.awardedExplainKeys).toContain('r:e:pp')
    expect(state.progress.totalXP).toBe(1)
  })
})
