import { describe, expect, it } from 'vitest'
import {
  formatLessonFinaleGoalLine,
  formatLessonFirstTryLine,
  formatLessonProfileLine,
  formatLessonStatsLine,
  formatLessonVerdictLine,
  gapToGoldPercent,
  hasGoldUnlocked,
  resolveXpStatsPraise,
} from '@/lib/lessonScoreCopy'

describe('gapToGoldPercent', () => {
  it('returns percent points to gold threshold', () => {
    expect(gapToGoldPercent(47)).toBe(43)
    expect(gapToGoldPercent(85)).toBe(5)
    expect(gapToGoldPercent(96)).toBe(0)
  })
})

describe('resolveXpStatsPraise', () => {
  it('returns praise tiers by core percent', () => {
    expect(resolveXpStatsPraise(96, 'child')).toBe('Супер!')
    expect(resolveXpStatsPraise(60, 'child')).toBe('Хорошо!')
    expect(resolveXpStatsPraise(30, 'child')).toBe('Неплохо!')
    expect(resolveXpStatsPraise(10, 'child')).toBeNull()
  })
})

describe('formatLessonStatsLine', () => {
  it('shows xp with average praise and gap to gold in points', () => {
    expect(
      formatLessonStatsLine({
        coreXp: 66,
        maxCoreXp: 140,
        corePercent: 47,
        comboXp: 0,
        audience: 'child',
      })
    ).toBe('Неплохо! 66 XP · до золота ещё 60 XP')
  })

  it('shows maximum for gold-level runs with high praise', () => {
    expect(
      formatLessonStatsLine({
        coreXp: 134,
        maxCoreXp: 140,
        corePercent: 96,
        comboXp: 0,
        audience: 'child',
      })
    ).toBe('Супер! 134 XP · максимум')
  })

  it('shows low score without praise', () => {
    expect(
      formatLessonStatsLine({
        coreXp: 0,
        maxCoreXp: 183,
        corePercent: 0,
        comboXp: 0,
        audience: 'child',
      })
    ).toBe('0 XP · до золота ещё 165 XP')
  })

  it('appends combo suffix when combo is positive', () => {
    expect(
      formatLessonStatsLine({
        coreXp: 66,
        maxCoreXp: 140,
        corePercent: 47,
        comboXp: 5,
        audience: 'child',
      })
    ).toBe('Неплохо! 66 XP · до золота ещё 60 XP · +5 за серию')
  })

  it('uses XP label for adult', () => {
    expect(
      formatLessonStatsLine({
        coreXp: 80,
        maxCoreXp: 140,
        corePercent: 57,
        comboXp: 0,
        audience: 'adult',
      })
    ).toBe('Хорошо. 80 XP · до золота ещё 46 XP')
  })
})

describe('formatLessonVerdictLine', () => {
  it('uses first-run medal label when no previous pass', () => {
    expect(
      formatLessonVerdictLine({
        corePercent: 47,
        previousCorePercent: null,
        profileMedal: null,
        runMedal: 'bronze',
        audience: 'child',
      })
    ).toBe('Бронза за этот проход.')
  })

  it('compares to previous pass', () => {
    expect(
      formatLessonVerdictLine({
        corePercent: 47,
        previousCorePercent: 40,
        profileMedal: null,
        runMedal: 'bronze',
        audience: 'child',
      })
    ).toBe('Лучше, чем в прошлый раз!')
  })

  it('notes lower score without profile line in verdict', () => {
    expect(
      formatLessonVerdictLine({
        corePercent: 85,
        previousCorePercent: 96,
        profileMedal: 'gold',
        runMedal: 'silver',
        audience: 'child',
      })
    ).toBe('Немного ниже прошлого.')
  })
})

describe('formatLessonProfileLine', () => {
  it('shows profile medal when higher than run medal', () => {
    expect(
      formatLessonProfileLine({
        profileMedal: 'gold',
        runMedal: 'silver',
        audience: 'child',
      })
    ).toBe('В профиле: золотая медаль сохраняется.')
  })

  it('returns null when profile medal is not higher', () => {
    expect(
      formatLessonProfileLine({
        profileMedal: 'bronze',
        runMedal: 'silver',
        audience: 'child',
      })
    ).toBeNull()
  })
})

describe('formatLessonFirstTryLine', () => {
  it('returns null when no first-try answers', () => {
    expect(
      formatLessonFirstTryLine({ firstTryCount: 0, totalScoredUnits: 10, audience: 'child' })
    ).toBeNull()
  })

  it('praises perfect first-try run', () => {
    expect(
      formatLessonFirstTryLine({ firstTryCount: 8, totalScoredUnits: 8, audience: 'child' })
    ).toBe('Все ответы с первого раза — супер!')
  })

  it('shows ratio praise for partial first tries', () => {
    expect(
      formatLessonFirstTryLine({ firstTryCount: 6, totalScoredUnits: 8, audience: 'child' })
    ).toBe('6 из 8 с первого раза — отлично!')
  })
})

describe('formatLessonFinaleGoalLine', () => {
  it('routes to practice when gold is unlocked', () => {
    expect(
      formatLessonFinaleGoalLine({
        profileMedal: 'gold',
        runMedal: 'silver',
        audience: 'child',
      })
    ).toContain('Практика')
  })

  it('routes to new variant when gold is not unlocked', () => {
    expect(
      formatLessonFinaleGoalLine({
        profileMedal: null,
        runMedal: 'bronze',
        audience: 'child',
      })
    ).toBe('Хочешь медаль выше — жми «Новый вариант». Практика скоро.')
  })
})

describe('hasGoldUnlocked', () => {
  it('is true for profile or run gold', () => {
    expect(hasGoldUnlocked('gold', 'silver')).toBe(true)
    expect(hasGoldUnlocked(null, 'gold')).toBe(true)
    expect(hasGoldUnlocked(null, 'bronze')).toBe(false)
  })
})
