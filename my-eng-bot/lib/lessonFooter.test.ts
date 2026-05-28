import { describe, expect, it } from 'vitest'
import { getLessonLearningSteps } from '@/lib/lessonFinale'
import {
  buildLessonFooterLive,
  computeLessonStagePercent,
  formatLessonCompletionFooter,
  resolveLessonCardMedal,
  resolveLessonHeaderMedal,
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
    ).toEqual({ percent: 100, completedUnits: 17, totalUnits: 17 })
  })

  it('uses scoring units for its-time-to (17 units)', () => {
    expect(listLessonScoringUnits(itsTimeToLesson)).toHaveLength(17)
  })

  it('reports 41% when 7 of 17 scoring units are completed (its-time-to step 3)', () => {
    expect(getLessonLearningSteps(itsTimeToLesson)).toHaveLength(7)

    const stage = computeLessonStagePercent({
      lesson: itsTimeToLesson,
      currentStep: 3,
      currentVariantIndex: 2,
      isFinale: false,
    })

    expect(stage).toEqual({ percent: 41, completedUnits: 7, totalUnits: 17 })
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
    expect(view.lessonSegments[0].text).toBe('🎯41%')
    expect(view.lessonSegments[1].text).toBe('⭐50(+8) XP')
    expect(view.lessonSegments[2].text).toBe('🔥×3(+5)')
    expect(view.lessonSegments[3].medalVisual).toEqual({
      mode: 'progress',
      nextTier: 'silver',
      progressPercent: 25,
    })
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
    expect(start.lessonSegments[3].medalVisual).toEqual({
      mode: 'tier',
      tier: 'bronze',
      muted: true,
    })

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
    expect(reset.lessonSegments[2].text).toBe('🔥×0 max 7')
  })

  it('shows combo streak label when milestone blocked below 50% core', () => {
    const view = buildLessonFooterLive({
      lesson: itsTimeToLesson,
      currentStep: 2,
      currentVariantIndex: 0,
      isFinale: false,
      coreXp: 47,
      maxCoreXp: 140,
      comboXp: 0,
      combo: 5,
      maxCombo: 5,
      comboMilestoneBlocked: true,
    })
    expect(view.lessonSegments[2].text).toBe('🔥×5')
  })

  it('shows finale medal tier visual', () => {
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
    expect(view.lessonSegments[3].medalVisual).toEqual({ mode: 'tier', tier: 'gold' })
  })
})

describe('resolveLessonHeaderMedal', () => {
  it('shows current bronze while footer progress targets silver', () => {
    const view = buildLessonFooterLive({
      lesson: itsTimeToLesson,
      currentStep: 3,
      currentVariantIndex: 2,
      isFinale: false,
      coreXp: 35,
      maxCoreXp: 140,
      comboXp: 15,
      combo: 3,
      maxCombo: 7,
    })

    expect(view.lessonSegments[3].medalVisual).toEqual({
      mode: 'progress',
      nextTier: 'silver',
      progressPercent: 25,
    })
    expect(
      resolveLessonHeaderMedal({ coreXp: 35, maxCoreXp: 140, isFinale: false })
    ).toEqual({
      tier: 'bronze',
      title: 'Сейчас: бронза',
    })
  })

  it('shows current silver while footer progress targets gold', () => {
    const view = buildLessonFooterLive({
      lesson: itsTimeToLesson,
      currentStep: 3,
      currentVariantIndex: 2,
      isFinale: false,
      coreXp: 80,
      maxCoreXp: 140,
      comboXp: 15,
      combo: 3,
      maxCombo: 7,
    })

    expect(view.lessonSegments[3].medalVisual).toMatchObject({
      mode: 'progress',
      nextTier: 'gold',
    })
    expect(
      resolveLessonHeaderMedal({ coreXp: 80, maxCoreXp: 140, isFinale: false })
    ).toEqual({
      tier: 'silver',
      title: 'Сейчас: серебро',
    })
  })

  it('maps start and finale medal visuals', () => {
    expect(
      resolveLessonHeaderMedal({ coreXp: 0, maxCoreXp: 140, isFinale: false })
    ).toEqual({
      tier: 'bronze',
      muted: true,
      title: 'Старт — медаль появится с первых очков',
    })

    expect(
      resolveLessonHeaderMedal({ coreXp: 126, maxCoreXp: 140, isFinale: true })
    ).toEqual({
      tier: 'gold',
      title: 'Золотая медаль',
    })
  })
})

describe('formatLessonCompletionFooter', () => {
  it('returns gold congratulations', () => {
    expect(formatLessonCompletionFooter('gold')).toBe('Золотая медаль — отлично!')
  })

  it('returns silver and bronze variants', () => {
    expect(formatLessonCompletionFooter('silver')).toContain('Серебряная медаль')
    expect(formatLessonCompletionFooter('bronze')).toContain('Бронза')
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

  it('returns gold tier from saved medal', () => {
    expect(
      resolveLessonCardMedal({
        ...baseProgress,
        medal: 'gold',
        coreXp: 120,
      })
    ).toEqual({ tier: 'gold', title: 'Сейчас: золото' })
  })

  it('returns live bronze when coreXp > 0 and no saved medal', () => {
    expect(
      resolveLessonCardMedal({
        ...baseProgress,
        coreXp: 35,
      })
    ).toEqual({ tier: 'bronze', title: 'Сейчас: бронза' })
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
    ).toEqual({ tier: 'silver', title: 'Сейчас: серебро' })
  })
})
