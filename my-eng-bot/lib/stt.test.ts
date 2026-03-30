import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeSttLanguage, transcribeWithOpenAI } from './stt'

describe('stt', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('normalizes locale-like language values', () => {
    expect(normalizeSttLanguage('ru-RU')).toBe('ru')
    expect(normalizeSttLanguage('en-US')).toBe('en')
    expect(normalizeSttLanguage('')).toBe('en')
  })

  it('transcribeWithOpenAI не передаёт language в OpenAI при автоопределении', async () => {
    let captured: FormData | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        captured = init?.body as FormData
        return new Response(JSON.stringify({ text: 'ok' }), { status: 200 })
      })
    )
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')

    await transcribeWithOpenAI({
      audioBlob: new Blob([Uint8Array.from([1, 2, 3])]),
      fileName: 'speech.webm',
    })

    expect(captured?.get('language')).toBeNull()
    expect(captured?.get('model')).toBe('whisper-1')
  })

  it('transcribeWithOpenAI передаёт language при явном ru/en', async () => {
    let captured: FormData | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        captured = init?.body as FormData
        return new Response(JSON.stringify({ text: 'ok' }), { status: 200 })
      })
    )
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')

    await transcribeWithOpenAI({
      audioBlob: new Blob([Uint8Array.from([1, 2, 3])]),
      fileName: 'speech.webm',
      language: 'ru',
    })

    expect(captured?.get('language')).toBe('ru')
  })
})
