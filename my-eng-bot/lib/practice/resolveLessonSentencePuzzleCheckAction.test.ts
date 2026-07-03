import { describe, expect, it } from 'vitest'
import { resolveLessonSentencePuzzleCheckAction } from '@/lib/practice/resolveLessonSentencePuzzleCheckAction'

describe('resolveLessonSentencePuzzleCheckAction', () => {
  it('practice mode submits when filled regardless of correctness', () => {
    expect(
      resolveLessonSentencePuzzleCheckAction({
        submitMode: 'practice',
        isFilled: true,
        isCorrect: false,
      })
    ).toBe('practiceSubmit')
  })

  it('lesson mode retries on incorrect answer', () => {
    expect(
      resolveLessonSentencePuzzleCheckAction({
        submitMode: 'lesson',
        isFilled: true,
        isCorrect: false,
      })
    ).toBe('lessonRetry')
  })

  it('lesson mode succeeds on correct answer', () => {
    expect(
      resolveLessonSentencePuzzleCheckAction({
        submitMode: 'lesson',
        isFilled: true,
        isCorrect: true,
      })
    ).toBe('lessonSuccess')
  })

  it('noop when not filled', () => {
    expect(
      resolveLessonSentencePuzzleCheckAction({
        submitMode: 'practice',
        isFilled: false,
        isCorrect: false,
      })
    ).toBe('noop')
  })
})
