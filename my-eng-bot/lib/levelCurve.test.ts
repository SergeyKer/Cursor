import { describe, expect, it } from 'vitest'
import {
  calculateLevelFromTotalXp,
  normalizeTotalXp,
  totalXpToReachLevel,
  xpBarForLevel,
} from '@/lib/levelCurve'

describe('levelCurve', () => {
  it('defines arithmetic bars', () => {
    expect(xpBarForLevel(1)).toBe(100)
    expect(xpBarForLevel(5)).toBe(180)
    expect(xpBarForLevel(10)).toBe(280)
  })

  it('normalizes invalid total XP', () => {
    expect(normalizeTotalXp(Number.NaN)).toBe(0)
    expect(normalizeTotalXp(Number.POSITIVE_INFINITY)).toBe(0)
    expect(normalizeTotalXp(-12.7)).toBe(0)
    expect(normalizeTotalXp(12.7)).toBe(12)
    expect(normalizeTotalXp(Number.MAX_SAFE_INTEGER + 100)).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('maps low XP thresholds without off-by-one', () => {
    expect(calculateLevelFromTotalXp(0)).toEqual({ level: 1, currentLevelXP: 0, xpToNextLevel: 100 })
    expect(calculateLevelFromTotalXp(99)).toEqual({ level: 1, currentLevelXP: 99, xpToNextLevel: 100 })
    expect(calculateLevelFromTotalXp(100)).toEqual({ level: 2, currentLevelXP: 0, xpToNextLevel: 120 })
  })

  it('uses cumulative threshold for level 10', () => {
    expect(totalXpToReachLevel(10)).toBe(1620)
    expect(calculateLevelFromTotalXp(1620)).toEqual({ level: 10, currentLevelXP: 0, xpToNextLevel: 280 })
    expect(calculateLevelFromTotalXp(1619)).toEqual({
      level: 9,
      currentLevelXP: 1619 - totalXpToReachLevel(9),
      xpToNextLevel: xpBarForLevel(9),
    })
    expect(calculateLevelFromTotalXp(1621)).toEqual({ level: 10, currentLevelXP: 1, xpToNextLevel: 280 })
  })

  it('checks neighboring thresholds for several levels', () => {
    for (const level of [2, 3, 5, 15, 27, 43]) {
      const threshold = totalXpToReachLevel(level)
      expect(calculateLevelFromTotalXp(threshold - 1).level).toBe(level - 1)
      expect(calculateLevelFromTotalXp(threshold)).toEqual({
        level,
        currentLevelXP: 0,
        xpToNextLevel: xpBarForLevel(level),
      })
      expect(calculateLevelFromTotalXp(threshold + 1)).toEqual({
        level,
        currentLevelXP: 1,
        xpToNextLevel: xpBarForLevel(level),
      })
    }
  })

  it('keeps bar invariants for huge XP', () => {
    const view = calculateLevelFromTotalXp(Number.MAX_SAFE_INTEGER)
    expect(view.level).toBeGreaterThan(1)
    expect(view.currentLevelXP).toBeGreaterThanOrEqual(0)
    expect(view.currentLevelXP).toBeLessThan(view.xpToNextLevel)
    expect(totalXpToReachLevel(view.level)).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER)
  })

  it('matches pacing smoke points', () => {
    expect(calculateLevelFromTotalXp(1820).level).toBe(10)
    expect(calculateLevelFromTotalXp(21840).level).toBe(43)
  })

  it('holds reach/bar invariant across sampled XP', () => {
    for (const xp of [0, 1, 50, 100, 250, 900, 1620, 5000, 21840, 31200]) {
      const view = calculateLevelFromTotalXp(xp)
      const reached = totalXpToReachLevel(view.level)
      const next = totalXpToReachLevel(view.level + 1)
      expect(reached).toBeLessThanOrEqual(xp)
      expect(xp).toBeLessThan(next)
      expect(view.currentLevelXP).toBe(xp - reached)
      expect(view.xpToNextLevel).toBe(xpBarForLevel(view.level))
    }
  })
})
