import { describe, expect, it } from 'vitest'
import {
  LESSON_BRIEFING_ACTIONS_PAUSE_MS,
  LESSON_BRIEFING_CARD_PAUSE_MS,
  LESSON_BRIEFING_COMPOSER_REVEAL_MS,
  LESSON_BUBBLE_ENTER_MS,
  LESSON_TASK_PROMPT_PAUSE_MS,
  LESSON_TEXT_FADE_MS,
  LESSON_TEXT_SECTION_PAUSE_MS,
  resolveLessonSectionRevealPauseMs,
} from '@/lib/lessonRevealTiming'

describe('briefing composer reveal timing', () => {
  it('sums bubble pause card fade and actions pause for full chain fallback', () => {
    expect(LESSON_BRIEFING_COMPOSER_REVEAL_MS).toBe(
      LESSON_BUBBLE_ENTER_MS +
        LESSON_BRIEFING_CARD_PAUSE_MS +
        LESSON_TEXT_FADE_MS +
        LESSON_BRIEFING_ACTIONS_PAUSE_MS
    )
    expect(LESSON_BRIEFING_ACTIONS_PAUSE_MS).toBe(LESSON_TEXT_SECTION_PAUSE_MS)
    expect(LESSON_BRIEFING_COMPOSER_REVEAL_MS).toBe(1300)
  })
})

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
