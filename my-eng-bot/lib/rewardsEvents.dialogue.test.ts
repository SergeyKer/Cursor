import { describe, expect, it } from 'vitest'
import { applyRewardsEvent } from './rewardsEvents'
import { createDefaultRewardsState, getTodayDateString } from './rewardsState'

describe('dialogue session rewards', () => {
  it('awards success steps and completes atomically at 8/8', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'dialogue_session_started' })
    for (let i = 0; i < 7; i += 1) {
      state = applyRewardsEvent(state, {
        type: 'dialogue_step_resolved',
        outcome: 'success',
        assistantKey: `k-${i}`,
      })
    }
    expect(state.dialogueSession.progress).toBe(7)
    expect(state.dialogueSession.status).toBe('in_progress')
    expect(state.ui.lastReward?.reason).toBe('dialogue_step_resolved')

    state = applyRewardsEvent(state, {
      type: 'dialogue_step_resolved',
      outcome: 'success',
      assistantKey: 'k-7',
    })
    expect(state.dialogueSession.progress).toBe(8)
    expect(state.dialogueSession.status).toBe('completed')
    expect(state.ui.lastReward?.reason).toBe('dialogue_session_completed')
    // 8*3 + 10 = 34, daily cap 28
    expect(state.dialogueSession.sessionXpAwarded).toBe(28)
    expect(state.dialogueSession.dailyXpAwarded).toBe(28)
    expect(state.progress.totalXP).toBe(28)
  })

  it('is idempotent on the same assistantKey', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'dialogue_session_started' })
    state = applyRewardsEvent(state, {
      type: 'dialogue_step_resolved',
      outcome: 'success',
      assistantKey: 'same',
    })
    const xp = state.progress.totalXP
    const again = applyRewardsEvent(state, {
      type: 'dialogue_step_resolved',
      outcome: 'success',
      assistantKey: 'same',
    })
    expect(again.progress.totalXP).toBe(xp)
    expect(again.dialogueSession.progress).toBe(1)
  })

  it('recovered awards +1 and advances progress', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'dialogue_session_started' })
    state = applyRewardsEvent(state, {
      type: 'dialogue_step_resolved',
      outcome: 'recovered',
      assistantKey: 'rec-1',
    })
    expect(state.dialogueSession.progress).toBe(1)
    expect(state.dialogueSession.sessionXpAwarded).toBe(1)
    expect(state.progress.totalXP).toBe(1)
  })

  it('stops XP after complete until restart', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'dialogue_session_started' })
    for (let i = 0; i < 8; i += 1) {
      state = applyRewardsEvent(state, {
        type: 'dialogue_step_resolved',
        outcome: 'success',
        assistantKey: `done-${i}`,
      })
    }
    const xp = state.progress.totalXP
    const next = applyRewardsEvent(state, {
      type: 'dialogue_step_resolved',
      outcome: 'success',
      assistantKey: 'after-complete',
    })
    expect(next.progress.totalXP).toBe(xp)
    expect(next.dialogueSession.progress).toBe(8)
  })

  it('abandons without clearing daily xp', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'dialogue_session_started' })
    state = applyRewardsEvent(state, {
      type: 'dialogue_step_resolved',
      outcome: 'success',
      assistantKey: 'a1',
    })
    const daily = state.dialogueSession.dailyXpAwarded
    state = applyRewardsEvent(state, { type: 'dialogue_session_abandoned' })
    expect(state.dialogueSession.status).toBe('abandoned')
    expect(state.dialogueSession.progress).toBe(0)
    expect(state.dialogueSession.dailyXpAwarded).toBe(daily)
  })

  it('keeps Daily Star close stamp after 8/8 abandon', () => {
    let state = applyRewardsEvent(createDefaultRewardsState(), { type: 'dialogue_session_started' })
    for (let i = 0; i < 8; i += 1) {
      state = applyRewardsEvent(state, {
        type: 'dialogue_step_resolved',
        outcome: 'success',
        assistantKey: `star-${i}`,
      })
    }
    state = applyRewardsEvent(state, { type: 'dialogue_session_abandoned' })
    expect(state.dialogueSession.status).toBe('abandoned')
    expect(state.dialogueSession.completedAt).toBe(getTodayDateString())
  })
})
