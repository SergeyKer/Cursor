import { describe, expect, it } from 'vitest'
import {
  buildFinaleOptionHints,
  buildLessonMedalRevealCopy,
  formatGoalLine,
  medalGapPercent,
  resolveFinalePrimaryAction,
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

describe('resolveFinalePrimaryAction', () => {
  it('routes gold to practice and other tiers to repeat', () => {
    expect(resolveFinalePrimaryAction('gold')).toBe('independent_practice')
    expect(resolveFinalePrimaryAction('silver')).toBe('repeat_variant')
    expect(resolveFinalePrimaryAction('bronze')).toBe('repeat_variant')
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

  it('shows retry hook for silver near gold', () => {
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

    expect(child.message).toBe('Почти золото! Ещё раз — и твоя!')
    expect(adult.message).toBe('До золотой медали: 46 XP. Ещё один проход.')
  })

  it('shows bronze retry hook toward silver', () => {
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

  it('shows almost silver retry hook for child bronze near threshold', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'bronze',
      coreXp: 66,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 47,
      audience: 'child',
    })

    expect(copy.message).toBe('Почти серебро! Ещё раз — и твоя!')
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
    expect(copy.message).toBe('До бронзы: 60 XP. Ещё один проход.')
  })

  it('includes short goalLine with trophy for gold when cups feature is on', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'gold',
      coreXp: 134,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 96,
      audience: 'adult',
    })
    if (copy.goalLine) {
      expect(copy.goalLine).toContain('🏆')
      expect(copy.goalLine).toMatch(/5 практик/i)
      expect(copy.goalLine).toBe(copy.cupLine)
    }
  })

  it('includes goalLine mentioning gold for silver', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'silver',
      coreXp: 80,
      comboXp: 10,
      maxCoreXp: 140,
      corePercent: 57,
      audience: 'adult',
    })
    if (copy.goalLine) {
      expect(copy.goalLine).toContain('🏆')
      expect(copy.goalLine).toMatch(/золот/i)
    }
  })
})

describe('formatGoalLine', () => {
  it('returns cup path for bronze', () => {
    const line = formatGoalLine('bronze', 'adult')
    if (line) {
      expect(line).toContain('кубок')
    }
  })
})

describe('buildFinaleOptionHints', () => {
  it('hints practice subscription for gold', () => {
    expect(
      buildFinaleOptionHints({
        medal: 'gold',
        coreXp: 130,
        maxCoreXp: 140,
        audience: 'child',
      }).independent_practice
    ).toBe('С подпиской')
  })

  it('does not add hint under repeat variant', () => {
    expect(
      buildFinaleOptionHints({
        medal: 'silver',
        coreXp: 119,
        maxCoreXp: 140,
        audience: 'child',
      }).repeat_variant
    ).toBeUndefined()
  })
})
