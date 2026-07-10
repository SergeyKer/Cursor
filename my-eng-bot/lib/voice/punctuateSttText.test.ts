import { afterEach, describe, expect, it, vi } from 'vitest'
import { finalizeVoiceTranscript, requestSttPunctuation } from './punctuateSttText'

describe('punctuateSttText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('skips API when punctuation is already present', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(finalizeVoiceTranscript('Hello! Who are you?')).resolves.toBe('Hello! Who are you?')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('applies punctuated response when words are preserved', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ text: 'Hello! Who are you? I am a student.' })
      )
    )
    await expect(finalizeVoiceTranscript('hello who are you i am a student')).resolves.toBe(
      'Hello! Who are you? I am a student.'
    )
  })

  it('keeps learner words when model rewrites lake to like', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ text: 'I like to eat.' }))
    )
    await expect(finalizeVoiceTranscript('i lake to eat')).resolves.toBe('i lake to eat')
  })

  it('falls back on timeout/error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network')
      })
    )
    await expect(requestSttPunctuation('hello who are you')).resolves.toBe('hello who are you')
  })
})
