import { describe, expect, it } from 'vitest'
import { streakDailyBonusXp } from './streakDailyBonus'

describe('streakDailyBonusXp', () => {
  it('returns 0 for streak 0-2', () => {
    expect(streakDailyBonusXp(0)).toBe(0)
    expect(streakDailyBonusXp(1)).toBe(0)
    expect(streakDailyBonusXp(2)).toBe(0)
  })

  it('returns 10 for streak 3-4', () => {
    expect(streakDailyBonusXp(3)).toBe(10)
    expect(streakDailyBonusXp(4)).toBe(10)
  })

  it('returns 15 for streak 5-6', () => {
    expect(streakDailyBonusXp(5)).toBe(15)
    expect(streakDailyBonusXp(6)).toBe(15)
  })

  it('returns 20 for streak 7+', () => {
    expect(streakDailyBonusXp(7)).toBe(20)
    expect(streakDailyBonusXp(30)).toBe(20)
  })

  it('handles tier boundaries', () => {
    expect(streakDailyBonusXp(2)).toBe(0)
    expect(streakDailyBonusXp(3)).toBe(10)
    expect(streakDailyBonusXp(4)).toBe(10)
    expect(streakDailyBonusXp(5)).toBe(15)
    expect(streakDailyBonusXp(6)).toBe(15)
    expect(streakDailyBonusXp(7)).toBe(20)
  })
})
