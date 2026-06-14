import { describe, expect, it } from 'vitest'
import { getRevealPauseAfterSectionComplete } from '@/hooks/useLessonSectionReveal'
import {
  LESSON_TASK_PROMPT_PAUSE_MS,
  LESSON_TEXT_SECTION_PAUSE_MS,
} from '@/lib/lessonRevealTiming'

describe('getRevealPauseAfterSectionComplete', () => {
  it('uses short pause between positive and info', () => {
    expect(getRevealPauseAfterSectionComplete(0)).toBe(LESSON_TEXT_SECTION_PAUSE_MS)
  })

  it('uses task prompt pause before task section', () => {
    expect(
      getRevealPauseAfterSectionComplete(1, { extraPauseBeforeIndex: 2 })
    ).toBe(LESSON_TASK_PROMPT_PAUSE_MS)
  })

  it('uses custom extra pause ms', () => {
    expect(
      getRevealPauseAfterSectionComplete(1, {
        extraPauseBeforeIndex: 2,
        extraPauseMs: 400,
      })
    ).toBe(400)
  })
})
