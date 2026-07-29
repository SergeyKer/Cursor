import { describe, expect, it } from 'vitest'
import { resolveLessonMicStrategy } from './lessonMicLocale'

describe('resolveLessonMicStrategy', () => {
  it('defaults to browser English for lessons', () => {
    expect(resolveLessonMicStrategy()).toEqual({
      kind: 'browser',
      locale: 'en-US',
      apiLang: 'en',
    })
    expect(resolveLessonMicStrategy('en')).toEqual({
      kind: 'browser',
      locale: 'en-US',
      apiLang: 'en',
    })
  })

  it('uses Whisper auto for tutor mix dictation', () => {
    expect(resolveLessonMicStrategy('mix')).toEqual({ kind: 'whisper-auto' })
  })
})
