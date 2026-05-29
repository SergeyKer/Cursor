import { describe, expect, it } from 'vitest'
import {
  buildLessonMedalRevealCopy,
  medalGapPercent,
  resolveMedalRevealVariant,
} from '@/lib/lessonMedalRevealCopy'

describe('resolveMedalRevealVariant', () => {
  it('maps medal tiers to card variants', () => {
    expect(resolveMedalRevealVariant('gold')).toBe('gold')
    expect(resolveMedalRevealVariant('silver')).toBe('silver')
    expect(resolveMedalRevealVariant('bronze')).toBe('bronze')
    expect(resolveMedalRevealVariant(null)).toBe('neutral')
  })
})

describe('medalGapPercent', () => {
  it('returns percent gap to next tier', () => {
    expect(medalGapPercent(119, 140)).toBe(5)
    expect(medalGapPercent(35, 140)).toBe(25)
  })
})

describe('buildLessonMedalRevealCopy', () => {
  it('uses child-friendly stats without combo when combo is zero', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'gold',
      coreXp: 134,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 96,
      audience: 'child',
    })

    expect(copy.statsLine).toBe('134 очков за ответы · 96% точности')
    expect(copy.statsLine).not.toContain('core')
    expect(copy.message).toBe('Супер! Почти все ответы верные!')
  })

  it('uses child stats with combo bonus when combo is positive', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'gold',
      coreXp: 134,
      comboXp: 5,
      maxCoreXp: 140,
      corePercent: 96,
      audience: 'child',
    })

    expect(copy.statsLine).toBe('134 очков за ответы + 5 за серию · 96% точности')
  })

  it('keeps adult terminology', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'gold',
      coreXp: 134,
      comboXp: 5,
      maxCoreXp: 140,
      corePercent: 96,
      audience: 'adult',
    })

    expect(copy.statsLine).toBe('134 core + 5 combo · 96%')
    expect(copy.message).toBe('Отличный результат по точности ответов.')
  })

  it('shows silver gap to gold for child and adult', () => {
    const child = buildLessonMedalRevealCopy({
      medal: 'silver',
      coreXp: 119,
      comboXp: 10,
      maxCoreXp: 140,
      corePercent: 85,
      audience: 'child',
    })
    const adult = buildLessonMedalRevealCopy({
      medal: 'silver',
      coreXp: 80,
      comboXp: 10,
      maxCoreXp: 140,
      corePercent: 57,
      audience: 'adult',
    })

    expect(child.message).toBe('Почти золото!')
    expect(adult.message).toBe('До золота: 46 XP за шаги')
  })

  it('shows bronze gap to silver, not gold', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'bronze',
      coreXp: 35,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 25,
      audience: 'child',
    })

    expect(copy.message).toContain('серебра')
    expect(copy.message).not.toContain('золота')
    expect(copy.title).toBe('Бронзовая медаль!')
  })

  it('shows almost silver for child bronze near threshold', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'bronze',
      coreXp: 66,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 47,
      audience: 'child',
    })

    expect(copy.message).toBe('Почти серебро!')
  })

  it('shows gap to bronze when medal is null', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: null,
      coreXp: 10,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 7,
      audience: 'adult',
    })

    expect(copy.title).toBe('Урок пройден!')
    expect(copy.variant).toBe('neutral')
    expect(copy.message).toBe('До бронзы: 60 XP за шаги')
  })

  it('includes cupLine with trophy for gold when cups feature is on', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'gold',
      coreXp: 134,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 96,
      audience: 'adult',
    })
    if (copy.cupLine) {
      expect(copy.cupLine).toContain('🏆')
      expect(copy.cupLine).toMatch(/5 практик/i)
    }
  })

  it('includes cupLine mentioning gold for silver', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'silver',
      coreXp: 80,
      comboXp: 10,
      maxCoreXp: 140,
      corePercent: 57,
      audience: 'adult',
    })
    if (copy.cupLine) {
      expect(copy.cupLine).toContain('🏆')
      expect(copy.cupLine).toMatch(/золот/i)
    }
  })
})
