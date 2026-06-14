import { describe, expect, it } from 'vitest'
import {
  LESSON_TASK_PROMPT_PAUSE_MS,
  LESSON_TEXT_SECTION_PAUSE_MS,
  resolveLessonSectionRevealPauseMs,
} from '@/lib/lessonRevealTiming'

describe('resolveLessonSectionRevealPauseMs', () => {
  it('uses short pause between positive and info', () => {
    expect(resolveLessonSectionRevealPauseMs({ completedSectionIndex: 0 })).toBe(
      LESSON_TEXT_SECTION_PAUSE_MS
    )
  })

  it('uses task prompt pause before task section', () => {
    expect(
      resolveLessonSectionRevealPauseMs({
        completedSectionIndex: 1,
        extraPauseBeforeIndex: 2,
      })
    ).toBe(LESSON_TASK_PROMPT_PAUSE_MS)
  })

  it('custom extra pause ms', () => {
    expect(
      resolveLessonSectionRevealPauseMs({
        completedSectionIndex: 1,
        extraPauseBeforeIndex: 2,
        extraPauseMs: 400,
      })
    ).toBe(400)
  })
})
