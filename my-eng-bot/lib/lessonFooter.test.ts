import { describe, expect, it } from 'vitest'
import { getLessonLearningSteps } from '@/lib/lessonFinale'
import {
  buildLessonFooterLive,
  computeLessonStagePercent,
  formatLessonCompletionFooter,
  resolveLessonCardMedal,
} from '@/lib/lessonFooter'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { listLessonScoringUnits } from '@/lib/lessonScore'
import type { UserLessonProgress } from '@/types/userProgress'

describe('computeLessonStagePercent', () => {
  it('returns 0% without lesson and 100% on finale', () => {
    expect(
      computeLessonStagePercent({
        lesson: null,
        currentStep: 0,
        currentVariantIndex: 0,
        isFinale: false,
      })
    ).toEqual({ percent: 0, completedUnits: 0, totalUnits: 0 })

    expect(
      computeLessonStagePercent({
        lesson: itsTimeToLesson,
        currentStep: 0,
        currentVariantIndex: 0,
        isFinale: true,
      })
    ).toEqual({ percent: 100, completedUnits: 13, totalUnits: 13 })
  })

  it('uses scoring units for its-time-to (13 units)', () => {
    expect(listLessonScoringUnits(itsTimeToLesson)).toHaveLength(13)
  })

  it('reports 54% when 7 of 13 scoring units are completed (its-time-to step 3)', () => {
    expect(getLessonLearningSteps(itsTimeToLesson)).toHaveLength(7)

    const stage = computeLessonStagePercent({
      lesson: itsTimeToLesson,
      currentStep: 3,
      currentVariantIndex: 2,
      isFinale: false,
    })

    expect(stage).toEqual({ percent: 54, completedUnits: 7, totalUnits: 13 })
  })
})

describe('buildLessonFooterLive', () => {
  it('builds four segments without account line', () => {
    const view = buildLessonFooterLive({
      lesson: itsTimeToLesson,
      currentStep: 3,
      currentVariantIndex: 2,
      isFinale: false,
      coreXp: 35,
      maxCoreXp: 140,
      comboXp: 15,
      coreDelta: 8,
      combo: 3,
      maxCombo: 7,
      comboDelta: 5,
    })

    expect(view.lessonSegments.map((segment) => segment.kind)).toEqual(['goal', 'xp', 'combo', 'medal'])
    expect(view.lessonSegments.map((segment) => segment.text)).toEqual([
      '🎯54%',
      '⭐50(+8) XP',
      '🔥×3(+5 XP)',
      '🥈→25%',
    ])
    expect(view.accountSegments).toEqual([])
    expect(view.accountLine).toBe('')
  })

  it('shows combo record after reset and start medal at 0 core xp', () => {
    const start = buildLessonFooterLive({
      lesson: itsTimeToLesson,
      currentStep: 0,
      currentVariantIndex: 0,
      isFinale: false,
      coreXp: 0,
      maxCoreXp: 140,
      comboXp: 0,
      combo: 0,
      maxCombo: 0,
    })
    expect(start.lessonSegments[0].text).toBe('🎯0%')
    expect(start.lessonSegments[1].text).toBe('⭐0 XP')
    expect(start.lessonSegments[2].text).toBe('🔥×0')
    expect(start.lessonSegments[3].text).toBe('🥉')

    const reset = buildLessonFooterLive({
      lesson: itsTimeToLesson,
      currentStep: 3,
      currentVariantIndex: 2,
      isFinale: false,
      coreXp: 118,
      maxCoreXp: 140,
      comboXp: 30,
      combo: 0,
      maxCombo: 7,
    })
    expect(reset.lessonSegments[2].text).toBe('🔥×0 рек.×7')
  })

  it('shows finale medal emoji only', () => {
    const view = buildLessonFooterLive({
      lesson: itsTimeToLesson,
      currentStep: 0,
      currentVariantIndex: 0,
      isFinale: true,
      coreXp: 126,
      maxCoreXp: 140,
      comboXp: 30,
      combo: 3,
      maxCombo: 7,
    })
    expect(view.lessonSegments[0].text).toBe('🎯100%')
    expect(view.lessonSegments[3].text).toBe('🥇')
  })
})

describe('formatLessonCompletionFooter', () => {
  it('returns gold congratulations', () => {
    expect(formatLessonCompletionFooter('gold')).toBe(
      'Поздравляем! Золотая медаль — отличный результат!'
    )
  })

  it('returns silver and bronze variants', () => {
    expect(formatLessonCompletionFooter('silver')).toContain('Серебряная медаль')
    expect(formatLessonCompletionFooter('bronze')).toContain('Бронзовая медаль')
  })

  it('returns generic completion without medal', () => {
    expect(formatLessonCompletionFooter(null)).toBe('Урок пройден! Отличная работа!')
  })
})

describe('resolveLessonCardMedal', () => {
  const baseProgress = {
    lessonId: 'introducing-yourself',
    topic: 'I am / I am from',
    level: 'A1',
    completedSteps: [],
    completedVariants: [],
    xp: 0,
    combo: 0,
    coreXp: 0,
    comboXp: 0,
    totalXp: 0,
    maxCoreXp: 140,
    corePercent: 0,
    strengthPercent: 0,
    maxCombo: 0,
    bestCoreXp: 0,
    medal: null,
    mistakes: [],
    lastCompleted: '',
  } satisfies UserLessonProgress

  it('returns gold emoji from saved medal', () => {
    expect(
      resolveLessonCardMedal({
        ...baseProgress,
        medal: 'gold',
        coreXp: 120,
      })
    ).toEqual({ emoji: '🥇', title: 'Сейчас: золото' })
  })

  it('returns live bronze when coreXp > 0 and no saved medal', () => {
    expect(
      resolveLessonCardMedal({
        ...baseProgress,
        coreXp: 35,
      })
    ).toEqual({ emoji: '🥉', title: 'Сейчас: бронза' })
  })

  it('returns null when no progress', () => {
    expect(resolveLessonCardMedal(null)).toBeNull()
    expect(resolveLessonCardMedal(baseProgress)).toBeNull()
  })

  it('prefers saved medal over live state', () => {
    expect(
      resolveLessonCardMedal({
        ...baseProgress,
        medal: 'silver',
        coreXp: 10,
      })
    ).toEqual({ emoji: '🥈', title: 'Сейчас: серебро' })
  })
})
