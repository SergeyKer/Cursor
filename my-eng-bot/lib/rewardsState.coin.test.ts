import { describe, expect, it } from 'vitest'
import { applyRewardsEvent } from './rewardsEvents'
import {
  awardCoins,
  createDefaultRewardsState,
  spendCoins,
} from './rewardsState'

describe('coin ledger and balance helpers', () => {
  it('awardCoins increases balance and marks lesson in ledger', () => {
    const state = createDefaultRewardsState()
    state.currencies.coins = 3
    const awarded = awardCoins(state, 1, { lessonIdForLedger: 'lesson-a' })
    expect(awarded.ok).toBe(true)
    expect(awarded.state.currencies.coins).toBe(4)
    expect(awarded.state.coinLedger.lessonGoldClaimed['lesson-a']).toBe(true)
  })

  it('spendCoins after awardCoins keeps correct balance', () => {
    let state = createDefaultRewardsState()
    state.currencies.coins = 2
    const awarded = awardCoins(state, 1, { lessonIdForLedger: 'lesson-a' })
    state = awarded.state
    const spent = spendCoins(state, 1)
    expect(spent.ok).toBe(true)
    expect(spent.state.currencies.coins).toBe(2)
    expect(spent.state.coinLedger.lessonGoldClaimed['lesson-a']).toBe(true)
  })

  it('createDefaultRewardsState includes empty coin ledger', () => {
    expect(createDefaultRewardsState().coinLedger.lessonGoldClaimed).toEqual({})
    expect(createDefaultRewardsState().coinLedger.practiceMilestones).toEqual({})
  })

  it('awards each practice milestone only once', () => {
    const state = createDefaultRewardsState()
    state.currencies.coins = 0
    const first = awardCoins(state, 1, { practiceMilestoneForLedger: 'topic-1:ring3' })
    const duplicate = awardCoins(first.state, 1, { practiceMilestoneForLedger: 'topic-1:ring3' })

    expect(first.ok).toBe(true)
    expect(first.state.currencies.coins).toBe(1)
    expect(first.state.coinLedger.practiceMilestones['topic-1:ring3']).toBe(true)
    expect(duplicate.ok).toBe(false)
    expect(duplicate.state.currencies.coins).toBe(1)
  })

  it('coins_earned event updates ui without changing balance again', () => {
    const state = createDefaultRewardsState()
    state.currencies.coins = 5
    const next = applyRewardsEvent(state, {
      type: 'coins_earned',
      amount: 1,
      reason: 'lesson_gold',
      ticker: 'Золотая медаль. +1 🪙.',
    })
    expect(next.currencies.coins).toBe(5)
    expect(next.progress.totalXP).toBe(0)
    expect(next.ui.footerTicker).toBe('Золотая медаль. +1 🪙.')
    expect(next.ui.lastReward?.reason).toBe('lesson_gold')
    expect(next.ui.lastReward?.amount).toBe(1)
  })
})
