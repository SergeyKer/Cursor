import { afterEach, describe, expect, it, vi } from 'vitest'
import { finalizeVoiceTranscript, requestSttPunctuation } from './punctuateSttText'
import { hasTerminalPunctuation, tokenizeForWordGuard } from './sttPunctuation'

const SHORT_FIXTURE = 'hello my name is Sergey how are you'
const LONG_FIXTURE =
  "hello my name is Sergey how are you I am fine than you what are you doing now I'm watching TV on the TV"

function assertPunctuatedPreservingWords(input: string, output: string) {
  expect(hasTerminalPunctuation(output)).toBe(true)
  expect(tokenizeForWordGuard(output)).toEqual(tokenizeForWordGuard(input))
}

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
      vi.fn(async () => Response.json({ text: 'Hello! Who are you? I am a student.' }))
    )
    await expect(finalizeVoiceTranscript('hello who are you i am a student')).resolves.toBe(
      'Hello! Who are you? I am a student.'
    )
  })

  it('falls back to local when model rewrites lake to like', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ text: 'I like to eat.' })))
    const out = await finalizeVoiceTranscript('i lake to eat')
    assertPunctuatedPreservingWords('i lake to eat', out)
    expect(tokenizeForWordGuard(out)).toContain('lake')
  })

  it('falls back to local when model rewrites than to thank', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          text: 'Hello! My name is Sergey. How are you? I am fine thank you. What are you doing now? I am watching TV on the TV.',
        })
      )
    )
    const out = await finalizeVoiceTranscript(LONG_FIXTURE)
    assertPunctuatedPreservingWords(LONG_FIXTURE, out)
    expect(out.toLowerCase()).toContain('than')
  })

  it('falls back to local on API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network')
      })
    )
    const out = await finalizeVoiceTranscript(SHORT_FIXTURE)
    assertPunctuatedPreservingWords(SHORT_FIXTURE, out)
  })

  it('falls back to local on HTTP 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('fail', { status: 500 })))
    const out = await finalizeVoiceTranscript(SHORT_FIXTURE)
    assertPunctuatedPreservingWords(SHORT_FIXTURE, out)
  })

  it('requestSttPunctuation returns null on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network')
      })
    )
    await expect(requestSttPunctuation('hello who are you')).resolves.toBeNull()
  })

  it('falls back to local on abort/timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((_resolve, reject) => {
            const error = new Error('aborted')
            error.name = 'AbortError'
            reject(error)
          })
      )
    )
    const out = await finalizeVoiceTranscript(SHORT_FIXTURE, { timeoutMs: 20 })
    assertPunctuatedPreservingWords(SHORT_FIXTURE, out)
  })
})
