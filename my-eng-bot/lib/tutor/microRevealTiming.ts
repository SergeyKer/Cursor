import {
  PRACTICE_ANSWER_REVEAL_MS,
  PRACTICE_CHECKING_MS,
} from '@/lib/practice/practiceAnswerPanelLock'

/** Hold after a staged assistant bubble before the next typing pause. */
export const TUTOR_MICRO_BUBBLE_HOLD_MS = PRACTICE_ANSWER_REVEAL_MS

/** Typing / "thinking" pause between staged micro assistant messages. */
export const TUTOR_MICRO_TYPING_HOLD_MS = PRACTICE_CHECKING_MS

export class TutorMicroRevealAbortedError extends Error {
  constructor(message = 'Tutor micro reveal aborted') {
    super(message)
    this.name = 'TutorMicroRevealAbortedError'
  }
}

/** Resolves after `ms`, or rejects with TutorMicroRevealAbortedError if signal aborts. */
export function waitTutorMicroReveal(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new TutorMicroRevealAbortedError())
  }
  if (ms <= 0) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      globalThis.clearTimeout(timeoutId)
      reject(new TutorMicroRevealAbortedError())
    }

    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

export function isTutorMicroRevealAborted(error: unknown): boolean {
  return error instanceof TutorMicroRevealAbortedError
}
