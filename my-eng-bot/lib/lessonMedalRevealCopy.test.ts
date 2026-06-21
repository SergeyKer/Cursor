import { describe, expect, it } from 'vitest'
import {
  buildFinaleOptionHints,
  buildLessonMedalRevealCopy,
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
  it('routes gold run to practice and bronze to repeat', () => {
    expect(resolveFinalePrimaryAction('gold')).toBe('independent_practice')
    expect(resolveFinalePrimaryAction('silver')).toBe('repeat_variant')
    expect(resolveFinalePrimaryAction({ runMedal: 'silver', profileMedal: 'gold' })).toBe(
      'independent_practice'
    )
  })
})

describe('medalGapPercent', () => {
  it('returns percent gap to next tier', () => {
    expect(medalGapPercent(119, 140)).toBe(5)
    expect(medalGapPercent(35, 140)).toBe(25)
  })
})

describe('buildLessonMedalRevealCopy', () => {
  it('uses stats gap to gold and practice goal for gold run', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'gold',
      coreXp: 134,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 96,
      audience: 'child',
    })

    expect(copy.statsLine).toBe('Супер! 134 XP · максимум')
    expect(copy.message).toBe('Золото за этот проход.')
    expect(copy.goalLine).toContain('Практика')
    expect(copy.firstTryLine).toBeNull()
    expect(copy.profileLine).toBeNull()
  })

  it('uses repeat goal when gold is not unlocked', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'bronze',
      coreXp: 66,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 47,
      audience: 'child',
    })

    expect(copy.statsLine).toBe('Неплохо! 66 XP · до золота ещё 60 XP')
    expect(copy.goalLine).toBe('Хочешь медаль выше - жми «Новый вариант». Практика скоро.')
  })

  it('compares with previous pass on message line', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'bronze',
      coreXp: 66,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 47,
      audience: 'child',
      previousCorePercent: 40,
    })

    expect(copy.message).toBe('Лучше, чем в прошлый раз!')
  })

  it('routes profile gold to practice goal and profile line on silver run', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'silver',
      coreXp: 119,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 85,
      audience: 'child',
      profileMedal: 'gold',
      previousCorePercent: 96,
    })

    expect(copy.goalLine).toContain('Практика')
    expect(copy.message).toBe('Немного ниже прошлого.')
    expect(copy.profileLine).toBe('В профиле: золотая медаль сохраняется.')
  })

  it('includes first-try praise when provided', () => {
    const copy = buildLessonMedalRevealCopy({
      medal: 'bronze',
      coreXp: 66,
      comboXp: 0,
      maxCoreXp: 140,
      corePercent: 47,
      audience: 'child',
      firstTryCount: 6,
      totalScoredUnits: 8,
    })

    expect(copy.firstTryLine).toBe('6 из 8 с первого раза - отлично!')
  })
})

describe('buildFinaleOptionHints', () => {
  it('omits button hints for gold profile', () => {
    const hints = buildFinaleOptionHints({
      runMedal: 'silver',
      profileMedal: 'gold',
      coreXp: 119,
      maxCoreXp: 140,
      audience: 'child',
    })
    expect(hints.repeat_variant).toBeUndefined()
    expect(hints.independent_practice).toBeUndefined()
  })

  it('omits repeat hint when chasing gold', () => {
    const hints = buildFinaleOptionHints({
      medal: 'silver',
      coreXp: 119,
      maxCoreXp: 140,
      audience: 'child',
    })
    expect(hints.repeat_variant).toBeUndefined()
    expect(hints.independent_practice).toBe('Скоро')
  })
})
