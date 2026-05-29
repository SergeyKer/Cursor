import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  beginLessonCycle1,
  capLessonMedalForRun,
  closeLessonCycle1,
  isLocalStructuredLessonRun,
  resolveLessonSilverCapForRun,
  shouldCapGoldToSilver,
} from '@/lib/lessonAntiFarm'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: { lessonLocalSilverCapV1: true },
}))

const storage: Record<string, string> = {}

vi.mock('@/lib/lessonProgressStorage', () => ({
  loadLessonProgress: (lessonId: string) => {
    const raw = storage[lessonId]
    if (!raw) return null
    return JSON.parse(raw)
  },
  saveLessonProgress: (progress: { lessonId: string }) => {
    storage[progress.lessonId] = JSON.stringify(progress)
  },
}))

describe('lessonAntiFarm', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('isLocalStructuredLessonRun only for menu_reopen v1', () => {
    expect(isLocalStructuredLessonRun('menu_reopen', 1)).toBe(true)
    expect(isLocalStructuredLessonRun('menu_generate', 1)).toBe(false)
    expect(isLocalStructuredLessonRun('menu_reopen', 2)).toBe(false)
  })

  it('shouldCapGoldToSilver when cycle1Closed on local run', () => {
    expect(
      shouldCapGoldToSilver({
        isLocalLesson: true,
        cycle1Closed: true,
        isRepeatRun: false,
      })
    ).toBe(true)
    expect(
      shouldCapGoldToSilver({
        isLocalLesson: false,
        cycle1Closed: true,
        isRepeatRun: false,
      })
    ).toBe(false)
  })

  it('capLessonMedalForRun limits gold to silver', () => {
    expect(
      capLessonMedalForRun('gold', {
        isLocalLesson: true,
        cycle1Closed: true,
        isRepeatRun: false,
      })
    ).toBe('silver')
  })

  it('beginLessonCycle1 on first answer and closeLessonCycle1 on leave', () => {
    beginLessonCycle1('1', { topic: 'T', level: 'A2' })
    const started = storage['1']
    expect(started).toBeTruthy()
    expect(JSON.parse(started).cycle1Started).toBe(true)
    expect(JSON.parse(started).cycle1Closed).toBe(false)

    closeLessonCycle1('1')
    const closed = JSON.parse(storage['1'])
    expect(closed.cycle1Closed).toBe(true)
    expect(closed.lessonCycle).toBe(2)
  })

  it('resolveLessonSilverCapForRun matches generate vs local', () => {
    expect(
      resolveLessonSilverCapForRun({
        origin: 'menu_generate',
        variantNumber: 1,
        cycle1Closed: true,
        isRepeatRun: false,
      })
    ).toBe(false)
    expect(
      resolveLessonSilverCapForRun({
        origin: 'menu_reopen',
        variantNumber: 1,
        cycle1Closed: true,
        isRepeatRun: false,
      })
    ).toBe(true)
  })
})
