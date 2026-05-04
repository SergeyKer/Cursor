import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchWithLessonProviderDeadline,
  LESSON_MENU_GENERATE_CLIENT_BUFFER_MS,
  LESSON_PROVIDER_FETCH_TIMEOUT_MS_DEFAULT,
  LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS,
  lessonMenuGenerateClientTimeoutMs,
  resolveLessonRepeatMenuBypassMaxAttempts,
  resolveLessonProviderFetchTimeoutMs,
} from '@/lib/lessonProviderTimeouts'

describe('lessonProviderTimeouts', () => {
  const prevEnv = process.env.LESSON_PROVIDER_FETCH_TIMEOUT_MS
  const prevMenuAttempts = process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS

  afterEach(() => {
    if (prevEnv === undefined) {
      delete process.env.LESSON_PROVIDER_FETCH_TIMEOUT_MS
    } else {
      process.env.LESSON_PROVIDER_FETCH_TIMEOUT_MS = prevEnv
    }
    if (prevMenuAttempts === undefined) {
      delete process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS
    } else {
      process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS = prevMenuAttempts
    }
  })

  it('uses default timeout when env unset', () => {
    delete process.env.LESSON_PROVIDER_FETCH_TIMEOUT_MS
    expect(resolveLessonProviderFetchTimeoutMs()).toBe(LESSON_PROVIDER_FETCH_TIMEOUT_MS_DEFAULT)
  })

  it('clamps LESSON_PROVIDER_FETCH_TIMEOUT_MS', () => {
    process.env.LESSON_PROVIDER_FETCH_TIMEOUT_MS = '999999'
    expect(resolveLessonProviderFetchTimeoutMs()).toBe(300_000)
    process.env.LESSON_PROVIDER_FETCH_TIMEOUT_MS = '1000'
    expect(resolveLessonProviderFetchTimeoutMs()).toBe(5_000)
  })

  it('computes menu client timeout from attempts and buffer', () => {
    delete process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS
    expect(lessonMenuGenerateClientTimeoutMs(60_000)).toBe(
      LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS * 60_000 + LESSON_MENU_GENERATE_CLIENT_BUFFER_MS
    )
    process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS = '2'
    expect(lessonMenuGenerateClientTimeoutMs(60_000)).toBe(2 * 60_000 + LESSON_MENU_GENERATE_CLIENT_BUFFER_MS)
  })

  it('clamps LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS', () => {
    delete process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS
    expect(resolveLessonRepeatMenuBypassMaxAttempts()).toBe(LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS)
    process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS = '2'
    expect(resolveLessonRepeatMenuBypassMaxAttempts()).toBe(2)
    process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS = '99'
    expect(resolveLessonRepeatMenuBypassMaxAttempts()).toBe(2)
    process.env.LESSON_REPEAT_MENU_BYPASS_MAX_ATTEMPTS = '0'
    expect(resolveLessonRepeatMenuBypassMaxAttempts()).toBe(1)
  })

  it('fetchWithLessonProviderDeadline aborts when fetch honors AbortSignal', async () => {
    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal
      return new Promise<Response>((_resolve, reject) => {
        if (!signal) {
          reject(new Error('expected signal'))
          return
        }
        const onAbort = () => {
          const err = new Error('Aborted')
          err.name = 'AbortError'
          reject(err)
        }
        if (signal.aborted) onAbort()
        else signal.addEventListener('abort', onAbort, { once: true })
      })
    }) as typeof fetch

    try {
      await expect(
        fetchWithLessonProviderDeadline((signal) => fetch('http://lesson-provider-timeout.test', { signal }), {
          deadlineMs: 25,
        })
      ).rejects.toMatchObject({ name: 'AbortError' })
    } finally {
      globalThis.fetch = origFetch
    }
  })
})
