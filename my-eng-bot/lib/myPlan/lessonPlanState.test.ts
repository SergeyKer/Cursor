import { describe, expect, it } from 'vitest'
import {
  classifyLessonPlanState,
  isLessonInProgress,
  isLessonTheoryDone,
} from '@/lib/myPlan/lessonPlanState'
import type { MyPlanLessonProgressSlice } from '@/lib/myPlan/types'

function slice(over: Partial<MyPlanLessonProgressSlice> = {}): MyPlanLessonProgressSlice {
  return {
    lessonId: '1',
    topic: 't',
    completedSteps: [],
    lastCompleted: '',
    mistakesCount: 0,
    medal: null,
    lessonCompleted: false,
    ...over,
  }
}

describe('lessonPlanState', () => {
  it('not_started when no steps and not done', () => {
    expect(classifyLessonPlanState(slice())).toBe('not_started')
  })

  it('in_progress when steps and not done', () => {
    expect(classifyLessonPlanState(slice({ completedSteps: [1, 2] }))).toBe('in_progress')
    expect(isLessonInProgress(slice({ completedSteps: [1] }))).toBe(true)
  })

  it('sticky mid without lastCompleted stays in_progress', () => {
    expect(
      classifyLessonPlanState(slice({ completedSteps: [1, 2, 3, 4, 5, 6, 7], lastCompleted: '' }))
    ).toBe('in_progress')
  })

  it('lessonCompleted without lastCompleted is improve/done by medal, not continue', () => {
    expect(
      classifyLessonPlanState(
        slice({ lessonCompleted: true, lastCompleted: '', completedSteps: [1], medal: 'bronze' })
      )
    ).toBe('improve_medal')
    expect(isLessonInProgress(slice({ lessonCompleted: true, completedSteps: [1] }))).toBe(false)
  })

  it('bronze/silver/null medal after done → improve_medal', () => {
    expect(classifyLessonPlanState(slice({ lastCompleted: '2026-01-01', medal: 'bronze' }))).toBe(
      'improve_medal'
    )
    expect(classifyLessonPlanState(slice({ lastCompleted: '2026-01-01', medal: 'silver' }))).toBe(
      'improve_medal'
    )
    expect(classifyLessonPlanState(slice({ lastCompleted: '2026-01-01', medal: null }))).toBe(
      'improve_medal'
    )
  })

  it('gold → done_path', () => {
    expect(
      classifyLessonPlanState(slice({ lastCompleted: '2026-01-01', medal: 'gold', lessonCompleted: true }))
    ).toBe('done_path')
  })

  it('isLessonTheoryDone accepts lastCompleted or lessonCompleted', () => {
    expect(isLessonTheoryDone({ lastCompleted: 'x', lessonCompleted: false })).toBe(true)
    expect(isLessonTheoryDone({ lastCompleted: '', lessonCompleted: true })).toBe(true)
    expect(isLessonTheoryDone({ lastCompleted: '', lessonCompleted: false })).toBe(false)
  })
})
