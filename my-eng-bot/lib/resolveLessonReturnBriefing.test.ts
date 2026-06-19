import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getAllStructuredLessons } from '@/lib/structuredLessons'
import type { UserLessonProgress } from '@/types/userProgress'
import { resolveLessonReturnBriefing } from './resolveLessonReturnBriefing'

vi.mock('@/lib/lessonProgressStorage', () => ({
  loadLessonProgress: vi.fn(),
}))

import { loadLessonProgress } from '@/lib/lessonProgressStorage'

const loadLessonProgressMock = vi.mocked(loadLessonProgress)

const baseProgress = (overrides: Partial<UserLessonProgress> = {}): UserLessonProgress => ({
  lessonId: 'lesson-1',
  topic: 'Test',
  level: 'A1',
  completedSteps: [],
  completedVariants: [],
  xp: 0,
  combo: 0,
  coreXp: 0,
  comboXp: 0,
  totalXp: 0,
  maxCoreXp: 100,
  corePercent: 0,
  strengthPercent: 0,
  maxCombo: 0,
  bestCoreXp: 0,
  bestTotalXp: 0,
  medal: null,
  mistakes: [],
  lastCompleted: '',
  ...overrides,
})

const resolve = (overrides: Partial<Parameters<typeof resolveLessonReturnBriefing>[0]> = {}) =>
  resolveLessonReturnBriefing({
    lessonId: 'lesson-1',
    runKey: 'run-a',
    lessonTitle: 'I am',
    audience: 'adult',
    origin: 'menu_reopen',
    variantNumber: 1,
    isRepeatRun: false,
    ...overrides,
  })

describe('resolveLessonReturnBriefing', () => {
  beforeEach(() => {
    loadLessonProgressMock.mockReset()
  })

  it('returns first-run briefing when lesson was never started', () => {
    loadLessonProgressMock.mockReturnValue(null)

    const payload = resolve()

    expect(payload?.kind).toBe('first_run')
    expect(payload?.actions.primaryLabel).toBe('Продолжить')
  })

  it('returns first-run briefing when lesson is in progress without medal', () => {
    loadLessonProgressMock.mockReturnValue(
      baseProgress({
        cycle1Started: true,
        coreXp: 12,
        completedSteps: [1, 2],
      })
    )

    expect(resolve()?.kind).toBe('first_run')
  })

  it('returns cycle1 briefing when cycle1 closed without profile medal', () => {
    loadLessonProgressMock.mockReturnValue(
      baseProgress({
        cycle1Closed: true,
        cycle1Started: true,
      })
    )

    expect(resolve()?.kind).toBe('cycle1')
  })

  it('returns medal repeat briefing when lesson has profile medal', () => {
    loadLessonProgressMock.mockReturnValue(
      baseProgress({
        medal: 'bronze',
        bestTotalXp: 80,
        coreXp: 80,
      })
    )

    const payload = resolve({ isRepeatRun: true })

    expect(payload?.kind).toBe('medal_repeat')
    expect(payload?.runKey).toBe('lesson-1:run-a')
  })

  it('uses post_lesson_repeat context for generated repeat origin', () => {
    loadLessonProgressMock.mockReturnValue(
      baseProgress({
        medal: 'silver',
        bestTotalXp: 120,
      })
    )

    const payload = resolve({
      origin: 'post_lesson_repeat',
      isRepeatRun: true,
      coinIntroContext: {
        audience: 'adult',
        lessonCoinClaimed: false,
        isGeneratedVariantRun: true,
        profileMedal: 'silver',
      },
    })

    expect(payload?.kind).toBe('medal_repeat')
    expect(payload?.copy.message).toContain('В новом варианте золото снова в цели')
  })

  it('returns first-run with gold goal line for menu_generate', () => {
    loadLessonProgressMock.mockReturnValue(null)

    const payload = resolve({
      origin: 'menu_generate',
      coinIntroContext: {
        audience: 'adult',
        lessonCoinClaimed: false,
        isGeneratedVariantRun: true,
        profileMedal: null,
      },
    })

    expect(payload?.kind).toBe('first_run')
    expect(payload?.copy.message).toContain('Золото — при отличном результате')
    expect(payload?.copy.message).toContain('Комбо 3/5/7')
    expect(payload?.copy.message).toContain('пропустить за монету')
  })

  it('returns cycle1 briefing with thesis lines and dual CTA on local reopen', () => {
    loadLessonProgressMock.mockReturnValue(
      baseProgress({
        cycle1Closed: true,
        cycle1Started: true,
      })
    )

    const payload = resolve({
      origin: 'menu_reopen',
      variantNumber: 1,
      coinIntroContext: {
        audience: 'adult',
        lessonCoinClaimed: false,
        isGeneratedVariantRun: false,
        profileMedal: null,
      },
    })

    expect(payload?.kind).toBe('cycle1')
    expect(payload?.copy.title).toBe('Как устроен урок')
    expect(payload?.copy.message).toContain('максимум серебро')
    expect(payload?.copy.message).toContain('Комбо 3/5/7')
    expect(payload?.actions.offerGenerateVariant).toBe(true)
  })

  it('returns null when briefing already acknowledged for this run', () => {
    loadLessonProgressMock.mockReturnValue(
      baseProgress({
        medal: 'bronze',
      })
    )

    expect(
      resolve({
        isRepeatRun: true,
        acknowledgedRunKey: 'lesson-1:run-a',
      })
    ).toBeNull()
  })

  it.each(getAllStructuredLessons().map((lesson) => lesson.id))(
    'returns first-run briefing for catalog lesson %s with no progress',
    (lessonId) => {
      loadLessonProgressMock.mockReturnValue(null)

      const payload = resolveLessonReturnBriefing({
        lessonId,
        runKey: `run-${lessonId}`,
        lessonTitle: 'Lesson',
        audience: 'adult',
        origin: 'menu_reopen',
        variantNumber: 1,
        isRepeatRun: false,
      })

      expect(payload?.kind).toBe('first_run')
    }
  )
})
