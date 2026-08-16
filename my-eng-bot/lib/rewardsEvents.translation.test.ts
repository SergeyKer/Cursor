import { describe, expect, it } from 'vitest'
import { applyRewardsEvent } from './rewardsEvents'
import { createDefaultRewardsState, getTodayDateString } from './rewardsState'

describe('translation session rewards', () => {
  it('awards success steps and completes atomically at 8/8', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'translation_session_started' })
    for (let i = 0; i < 7; i += 1) {
      state = applyRewardsEvent(state, {
        type: 'translation_step_resolved',
        outcome: 'success',
        assistantKey: `k-${i}`,
      })
    }
    expect(state.translationSession.progress).toBe(7)
    expect(state.translationSession.status).toBe('in_progress')
    expect(state.ui.lastReward?.reason).toBe('translation_step_resolved')

    state = applyRewardsEvent(state, {
      type: 'translation_step_resolved',
      outcome: 'success',
      assistantKey: 'k-7',
    })
    expect(state.translationSession.progress).toBe(8)
    expect(state.translationSession.status).toBe('completed')
    expect(state.translationSession.completedAt).toBe(getTodayDateString())
    expect(state.ui.lastReward?.reason).toBe('translation_session_completed')
    // 8*4 + 12 = 44, daily cap 40
    expect(state.translationSession.sessionXpAwarded).toBe(40)
    expect(state.translationSession.dailyXpAwarded).toBe(40)
    expect(state.progress.totalXP).toBe(40)
  })

  it('is idempotent on the same assistantKey', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'translation_session_started' })
    state = applyRewardsEvent(state, {
      type: 'translation_step_resolved',
      outcome: 'success',
      assistantKey: 'same',
    })
    const xp = state.progress.totalXP
    const again = applyRewardsEvent(state, {
      type: 'translation_step_resolved',
      outcome: 'success',
      assistantKey: 'same',
    })
    expect(again.progress.totalXP).toBe(xp)
    expect(again.translationSession.progress).toBe(1)
  })

  it('soft_fail awards +1 and advances progress', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'translation_session_started' })
    state = applyRewardsEvent(state, {
      type: 'translation_step_resolved',
      outcome: 'soft_fail',
      assistantKey: 'sf-1',
    })
    expect(state.translationSession.progress).toBe(1)
    expect(state.translationSession.sessionXpAwarded).toBe(1)
    expect(state.progress.totalXP).toBe(1)
  })

  it('stops XP after complete until restart', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'translation_session_started' })
    for (let i = 0; i < 8; i += 1) {
      state = applyRewardsEvent(state, {
        type: 'translation_step_resolved',
        outcome: 'success',
        assistantKey: `done-${i}`,
      })
    }
    const xp = state.progress.totalXP
    const next = applyRewardsEvent(state, {
      type: 'translation_step_resolved',
      outcome: 'success',
      assistantKey: 'after-complete',
    })
    expect(next.progress.totalXP).toBe(xp)
    expect(next.translationSession.progress).toBe(8)
  })

  it('clamps second session same day to remaining daily budget', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'translation_session_started' })
    for (let i = 0; i < 8; i += 1) {
      state = applyRewardsEvent(state, {
        type: 'translation_step_resolved',
        outcome: 'success',
        assistantKey: `cap-${i}`,
      })
    }
    expect(state.translationSession.dailyXpAwarded).toBe(40)
    state = applyRewardsEvent(state, { type: 'translation_session_started' })
    state = applyRewardsEvent(state, {
      type: 'translation_step_resolved',
      outcome: 'success',
      assistantKey: 'second-session',
    })
    expect(state.translationSession.progress).toBe(1)
    expect(state.translationSession.sessionXpAwarded).toBe(0)
    expect(state.progress.totalXP).toBe(40)
  })

  it('abandons in-progress session without clearing daily xp', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'translation_session_started' })
    state = applyRewardsEvent(state, {
      type: 'translation_step_resolved',
      outcome: 'success',
      assistantKey: 'a1',
    })
    const daily = state.translationSession.dailyXpAwarded
    state = applyRewardsEvent(state, { type: 'translation_session_abandoned' })
    expect(state.translationSession.status).toBe('abandoned')
    expect(state.translationSession.progress).toBe(0)
    expect(state.translationSession.dailyXpAwarded).toBe(daily)
  })

  it('resets completed session on abandon but keeps daily xp', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'translation_session_started' })
    for (let i = 0; i < 8; i += 1) {
      state = applyRewardsEvent(state, {
        type: 'translation_step_resolved',
        outcome: 'soft_fail',
        assistantKey: `done-soft-${i}`,
      })
    }
    expect(state.translationSession.status).toBe('completed')
    const daily = state.translationSession.dailyXpAwarded
    state = applyRewardsEvent(state, { type: 'translation_session_abandoned' })
    expect(state.translationSession.status).toBe('abandoned')
    expect(state.translationSession.progress).toBe(0)
    expect(state.translationSession.dailyXpAwarded).toBe(daily)
  })
})
