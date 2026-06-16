import { describe, expect, it, vi, beforeEach } from 'vitest'
import { resolveLessonReturnBriefing } from './resolveLessonReturnBriefing'

vi.mock('@/lib/lessonProgressStorage', () => ({
  loadLessonProgress: vi.fn(),
}))

import { loadLessonProgress } from '@/lib/lessonProgressStorage'

const loadLessonProgressMock = vi.mocked(loadLessonProgress)

describe('resolveLessonReturnBriefing', () => {
  beforeEach(() => {
    loadLessonProgressMock.mockReset()
  })

  it('returns medal repeat briefing when lesson has profile medal', () => {
    loadLessonProgressMock.mockReturnValue({
      lessonId: 'lesson-1',
      topic: 'Test',
      level: 'A1',
      completedSteps: [],
      completedVariants: [],
      xp: 0,
      combo: 0,
      coreXp: 80,
      comboXp: 0,
      totalXp: 80,
      maxCoreXp: 100,
      corePercent: 80,
      strengthPercent: 80,
      maxCombo: 1,
      bestCoreXp: 80,
      bestTotalXp: 80,
      medal: 'bronze',
      mistakes: [],
      lastCompleted: '',
    })

    const payload = resolveLessonReturnBriefing({
      lessonId: 'lesson-1',
      runKey: 'run-a',
      lessonTitle: 'I am',
      audience: 'adult',
      origin: 'menu_reopen',
      variantNumber: 1,
      isRepeatRun: true,
    })

    expect(payload?.kind).toBe('medal_repeat')
    expect(payload?.runKey).toBe('lesson-1:run-a')
  })

  it('returns null when briefing already acknowledged for this run', () => {
    loadLessonProgressMock.mockReturnValue({
      lessonId: 'lesson-1',
      topic: 'Test',
      level: 'A1',
      completedSteps: [],
      completedVariants: [],
      xp: 0,
      combo: 0,
      coreXp: 80,
      comboXp: 0,
      totalXp: 80,
      maxCoreXp: 100,
      corePercent: 80,
      strengthPercent: 80,
      maxCombo: 1,
      bestCoreXp: 80,
      bestTotalXp: 80,
      medal: 'bronze',
      mistakes: [],
      lastCompleted: '',
    })

    expect(
      resolveLessonReturnBriefing({
        lessonId: 'lesson-1',
        runKey: 'run-a',
        lessonTitle: 'I am',
        audience: 'adult',
        origin: 'menu_reopen',
        variantNumber: 1,
        isRepeatRun: true,
        acknowledgedRunKey: 'lesson-1:run-a',
      })
    ).toBeNull()
  })
})
