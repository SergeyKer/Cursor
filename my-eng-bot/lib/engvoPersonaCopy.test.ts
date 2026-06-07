import { describe, expect, it } from 'vitest'
import {
  ENGVO_CHECKING_MESSAGE,
  ENGVO_CHECKING_FOOTER,
  ENGVO_LESSON_ADVANCING_MESSAGE,
  ENGVO_LESSON_ADVANCING_VARIANT_MESSAGE,
  ENGVO_TYPING_MESSAGE,
  ENGVO_TYPING_NEXT_STEP,
} from '@/lib/engvoPersonaCopy'
import { LESSON_CHECKING_MESSAGE } from '@/lib/lessonAnswerPanelLock'
import { PRACTICE_CHECKING_MESSAGE } from '@/lib/practice/practiceAnswerPanelLock'

describe('engvoPersonaCopy', () => {
  it('exports stable checking message for feed', () => {
    expect(ENGVO_CHECKING_MESSAGE).toBe('Engvo проверяет ответ...')
  })

  it('re-exports match lesson and practice checking constants', () => {
    expect(LESSON_CHECKING_MESSAGE).toBe(ENGVO_CHECKING_MESSAGE)
    expect(PRACTICE_CHECKING_MESSAGE).toBe(ENGVO_CHECKING_MESSAGE)
  })

  it('distinguishes step vs variant advancing copy', () => {
    expect(ENGVO_LESSON_ADVANCING_MESSAGE).toContain('шаг')
    expect(ENGVO_LESSON_ADVANCING_VARIANT_MESSAGE).toContain('задание')
    expect(ENGVO_TYPING_MESSAGE).toBe('Engvo печатает...')
    expect(ENGVO_TYPING_NEXT_STEP).toContain('следующий шаг')
    expect(ENGVO_CHECKING_FOOTER).not.toContain('...')
  })
})
