import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TUTOR_MICRO_BUBBLE_HOLD_MS,
  TUTOR_MICRO_TYPING_HOLD_MS,
  isTutorMicroRevealAborted,
  waitTutorMicroReveal,
  TutorMicroRevealAbortedError,
} from '@/lib/tutor/microRevealTiming'
import {
  PRACTICE_ANSWER_REVEAL_MS,
  PRACTICE_CHECKING_MS,
} from '@/lib/practice/practiceAnswerPanelLock'

describe('microRevealTiming', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reuses practice answer reveal and checking pauses', () => {
    expect(TUTOR_MICRO_BUBBLE_HOLD_MS).toBe(PRACTICE_ANSWER_REVEAL_MS)
    expect(TUTOR_MICRO_TYPING_HOLD_MS).toBe(PRACTICE_CHECKING_MS)
  })

  it('resolves after the requested delay', async () => {
    const done = waitTutorMicroReveal(500)
    await vi.advanceTimersByTimeAsync(499)
    let settled = false
    void done.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await done
    expect(settled).toBe(true)
  })

  it('rejects immediately when signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(waitTutorMicroReveal(1000, controller.signal)).rejects.toBeInstanceOf(
      TutorMicroRevealAbortedError
    )
  })

  it('rejects when signal aborts during wait', async () => {
    const controller = new AbortController()
    const pending = waitTutorMicroReveal(2000, controller.signal)
    await vi.advanceTimersByTimeAsync(200)
    controller.abort()
    await expect(pending).rejects.toBeInstanceOf(TutorMicroRevealAbortedError)
  })

  it('detects abort errors', () => {
    expect(isTutorMicroRevealAborted(new TutorMicroRevealAbortedError())).toBe(true)
    expect(isTutorMicroRevealAborted(new Error('other'))).toBe(false)
  })
})
