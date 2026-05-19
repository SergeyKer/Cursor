import { describe, expect, it } from 'vitest'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import {
  aggregateMedals,
  applyComboXpAward,
  awardCoreXpForUnit,
  COMBO_XP_CAP,
  computeCorePercent,
  getComboMilestoneXp,
  getUnitMaxXp,
  listLessonScoringUnits,
  resolveLiveFooterMedal,
  resolveMedal,
  sumMaxCoreXpForLesson,
  upgradeMedal,
  xpForAttempt,
} from '@/lib/lessonScore'

describe('lessonScore', () => {
  it('lists scoring units for its-time-to (13 units, max core 140)', () => {
    const units = listLessonScoringUnits(itsTimeToLesson)
    expect(units).toHaveLength(13)
    expect(units.filter((unit) => unit.kind === 'variant')).toHaveLength(6)
    expect(units.filter((unit) => unit.kind === 'puzzleSub')).toHaveLength(3)
    expect(units.filter((unit) => unit.kind === 'step')).toHaveLength(4)
  })

  it('sums max core xp to 140 for its-time-to', () => {
    expect(sumMaxCoreXpForLesson(itsTimeToLesson)).toBe(140)
  })

  it('scores easy variant lower than hard on same step with same attempt', () => {
    const units = listLessonScoringUnits(itsTimeToLesson)
    const step3 = units.filter((unit) => unit.stepNumber === 3)
    const easy = step3.find((unit) => unit.difficulty === 'easy')
    const hard = step3.find((unit) => unit.difficulty === 'hard')
    expect(easy).toBeTruthy()
    expect(hard).toBeTruthy()
    expect(getUnitMaxXp(easy!)).toBeLessThan(getUnitMaxXp(hard!))
    expect(xpForAttempt(getUnitMaxXp(easy!), 0)).toBeLessThan(xpForAttempt(getUnitMaxXp(hard!), 0))
  })

  it('uses three puzzle sub-units for step 5', () => {
    const units = listLessonScoringUnits(itsTimeToLesson).filter((unit) => unit.stepNumber === 5)
    expect(units).toHaveLength(3)
    expect(units.every((unit) => unit.kind === 'puzzleSub')).toBe(true)
  })

  it('applies attempt multipliers 100/75/25', () => {
    const max = 20
    expect(xpForAttempt(max, 0)).toBe(20)
    expect(xpForAttempt(max, 1)).toBe(15)
    expect(xpForAttempt(max, 2)).toBe(5)
    expect(xpForAttempt(max, 5)).toBe(5)
  })

  it('awards combo milestones once and caps total combo xp', () => {
    const claimed = new Set<number>()
    expect(getComboMilestoneXp(3, claimed)).toEqual({ combo: 3, xp: 5 })
    let comboXp = applyComboXpAward(0, 5)
    claimed.add(3)
    expect(getComboMilestoneXp(3, claimed)).toBeNull()
    expect(getComboMilestoneXp(5, claimed)).toEqual({ combo: 5, xp: 10 })
    comboXp = applyComboXpAward(comboXp, 10)
    claimed.add(5)
    expect(getComboMilestoneXp(7, claimed)).toEqual({ combo: 7, xp: 15 })
    comboXp = applyComboXpAward(comboXp, 15)
    expect(comboXp).toBe(30)
    expect(applyComboXpAward(comboXp, 5)).toBe(COMBO_XP_CAP)
  })

  it('resolves medal thresholds 50/90 with bronze on completed below 50%', () => {
    expect(resolveMedal(0, false)).toBeNull()
    expect(resolveMedal(89, false)).toBeNull()
    expect(resolveMedal(0, true)).toBe('bronze')
    expect(resolveMedal(49, true)).toBe('bronze')
    expect(resolveMedal(50, true)).toBe('silver')
    expect(resolveMedal(89, true)).toBe('silver')
    expect(resolveMedal(90, true)).toBe('gold')
  })

  it('upgrades medal only upward', () => {
    expect(upgradeMedal('bronze', 'silver')).toBe('silver')
    expect(upgradeMedal('silver', 'bronze')).toBe('silver')
    expect(upgradeMedal(null, 'gold')).toBe('gold')
    expect(upgradeMedal('gold', 'silver')).toBe('gold')
  })

  it('resolves live footer medal states', () => {
    expect(resolveLiveFooterMedal(0, 140)).toEqual({ current: 'grey', next: 'bronze' })
    expect(resolveLiveFooterMedal(35, 140)).toEqual({ current: 'bronze', next: 'silver' })
    expect(resolveLiveFooterMedal(80, 140)).toEqual({ current: 'silver', next: 'gold' })
    expect(resolveLiveFooterMedal(130, 140)).toEqual({ current: 'gold', next: null })
  })

  it('awards core xp via unit lookup for puzzle sub-index', () => {
    const xp = awardCoreXpForUnit(itsTimeToLesson, {
      stepNumber: 5,
      puzzleSubIndex: 0,
      attemptIndex: 0,
    })
    expect(xp).toBe(13)
  })

  it('aggregates medal counts', () => {
    expect(aggregateMedals(['gold', 'silver', 'bronze', null], 4)).toEqual({
      gold: 1,
      silver: 1,
      bronze: 1,
      totalLessons: 4,
    })
  })

  it('computes core percent against max 140', () => {
    expect(computeCorePercent(70, 140)).toBe(50)
    expect(computeCorePercent(126, 140)).toBe(90)
  })
})
