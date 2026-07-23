import { describe, expect, it } from 'vitest'
import { normalizeAnchorLevel, pickProgramLesson } from '@/lib/myPlan/pickProgramLesson'
import type { MyPlanCatalogTopic, MyPlanLessonProgressSlice } from '@/lib/myPlan/types'

const catalog: MyPlanCatalogTopic[] = [
  {
    id: '4',
    title: 'I am / I am from',
    order: 5,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    level: 'A1',
  },
  {
    id: '1',
    title: "It's / It's time to",
    order: 10,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    level: 'A2',
  },
  {
    id: '2',
    title: 'Who ...?',
    order: 20,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    level: 'A2',
  },
  {
    id: '3',
    title: 'I know what she likes',
    order: 30,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    level: 'A2',
  },
]

function progress(
  lessonId: string,
  over: Partial<MyPlanLessonProgressSlice> = {}
): MyPlanLessonProgressSlice {
  return {
    lessonId,
    topic: lessonId,
    completedSteps: [],
    lastCompleted: '',
    mistakesCount: 0,
    ...over,
  }
}

describe('normalizeAnchorLevel', () => {
  it('maps starter→A1, all→A2, cefr ids', () => {
    expect(normalizeAnchorLevel('starter')).toBe('A1')
    expect(normalizeAnchorLevel('all')).toBe('A2')
    expect(normalizeAnchorLevel('a1')).toBe('A1')
    expect(normalizeAnchorLevel('a2')).toBe('A2')
    expect(normalizeAnchorLevel('b1')).toBe('B1')
    expect(normalizeAnchorLevel(undefined)).toBe('A2')
  })
})

describe('pickProgramLesson', () => {
  it('A2 cold start → first A2 unstarted, not A1', () => {
    const r = pickProgramLesson({ catalog, lessons: {}, anchorLevel: 'A2' })
    expect(r.status).toBe('active')
    expect(r.lesson?.id).toBe('1')
    expect(r.unstartedCount).toBe(3)
  })

  it('A1 cold start → lesson 4', () => {
    const r = pickProgramLesson({ catalog, lessons: {}, anchorLevel: 'A1' })
    expect(r.status).toBe('active')
    expect(r.lesson?.id).toBe('4')
  })

  it('incomplete in anchor blocks new open', () => {
    const r = pickProgramLesson({
      catalog,
      lessons: {
        '1': progress('1', { completedSteps: [1], lastCompleted: '' }),
      },
      anchorLevel: 'A2',
    })
    expect(r.status).toBe('blocked_by_incomplete')
    expect(r.lesson).toBeNull()
  })

  it('incomplete outside anchor does not block', () => {
    const r = pickProgramLesson({
      catalog,
      lessons: {
        '4': progress('4', { completedSteps: [1], lastCompleted: '' }),
      },
      anchorLevel: 'A2',
    })
    expect(r.status).toBe('active')
    expect(r.lesson?.id).toBe('1')
  })

  it('after theory done → next unstarted by order', () => {
    const r = pickProgramLesson({
      catalog,
      lessons: {
        '1': progress('1', {
          completedSteps: [1, 2],
          lastCompleted: '2026-05-14T10:00:00.000Z',
        }),
      },
      anchorLevel: 'A2',
    })
    expect(r.status).toBe('active')
    expect(r.lesson?.id).toBe('2')
    expect(r.unstartedCount).toBe(2)
  })

  it('incomplete ≠ unstarted (!lastCompleted && steps>0)', () => {
    const r = pickProgramLesson({
      catalog,
      lessons: {
        '1': progress('1', { completedSteps: [1], lastCompleted: '' }),
        '2': progress('2', { completedSteps: [], lastCompleted: '' }),
      },
      anchorLevel: 'A2',
    })
    expect(r.status).toBe('blocked_by_incomplete')
    expect(r.lesson).toBeNull()
  })

  it('deterministic: two calls same lessonId', () => {
    const input = { catalog, lessons: {}, anchorLevel: 'A2' as const }
    const a = pickProgramLesson(input)
    const b = pickProgramLesson(input)
    expect(a.lesson?.id).toBe(b.lesson?.id)
    expect(a.lesson?.id).toBe('1')
  })

  it('all done → level_complete', () => {
    const done = {
      '1': progress('1', { lastCompleted: '2026-01-01', completedSteps: [1] }),
      '2': progress('2', { lastCompleted: '2026-01-02', completedSteps: [1] }),
      '3': progress('3', { lastCompleted: '2026-01-03', completedSteps: [1] }),
    }
    const r = pickProgramLesson({ catalog, lessons: done, anchorLevel: 'A2' })
    expect(r.status).toBe('level_complete')
    expect(r.lesson).toBeNull()
  })

  it('empty pool → no_catalog', () => {
    const r = pickProgramLesson({ catalog, lessons: {}, anchorLevel: 'B2' })
    expect(r.status).toBe('no_catalog')
  })

  it('first of two unstarted is lower order (no rotate)', () => {
    const r = pickProgramLesson({
      catalog,
      lessons: {
        '1': progress('1', { lastCompleted: '2026-01-01', completedSteps: [1] }),
      },
      anchorLevel: 'A2',
    })
    expect(r.lesson?.id).toBe('2')
    expect(r.unstartedCount).toBe(2)
  })
})
