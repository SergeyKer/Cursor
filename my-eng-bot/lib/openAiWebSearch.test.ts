import { describe, expect, it } from 'vitest'
import {
  formatOpenAiWebSearchAnswer,
  normalizeWebSearchSourceUrl,
  shouldRequestOpenAiWebSearchSources,
  shouldUseOpenAiWebSearch,
} from '@/lib/openAiWebSearchShared'

describe('shouldUseOpenAiWebSearch', () => {
  it('detects Russian current-info queries', () => {
    expect(shouldUseOpenAiWebSearch('Какая температура сейчас в Токио?')).toBe(true)
  })

  it('detects explicit internet requests', () => {
    expect(shouldUseOpenAiWebSearch('Посмотри в интернете, что нового в OpenAI')).toBe(true)
  })

  it('detects English current-info queries', () => {
    expect(shouldUseOpenAiWebSearch('What is the current price of Bitcoin?')).toBe(true)
  })

  it('does not trigger on general knowledge', () => {
    expect(shouldUseOpenAiWebSearch('Explain the difference between Present Perfect and Past Simple')).toBe(false)
  })
})

describe('formatOpenAiWebSearchAnswer', () => {
  it('adds the (i) prefix and returns only the answer text', () => {
    const result = formatOpenAiWebSearchAnswer({
      answer: 'В Токио сейчас около 18°C.',
      sources: [{ title: 'Example Weather', url: 'https://example.com/weather' }],
      language: 'ru',
    })

    expect(result).toContain('(i) В Токио сейчас около 18°C.')
    expect(result).not.toContain('Источник:')
  })

  it('does not duplicate the (i) prefix', () => {
    const result = formatOpenAiWebSearchAnswer({
      answer: '(i) It is about 18°C in Tokyo right now.',
      sources: [],
      language: 'en',
    })

    expect(result.startsWith('(i)')).toBe(true)
    expect(result).not.toContain('(i) (i)')
  })
})

describe('shouldRequestOpenAiWebSearchSources', () => {
  it('detects explicit source requests in Russian', () => {
    expect(shouldRequestOpenAiWebSearchSources('Покажи источники')).toBe(true)
  })

  it('detects explicit source requests in English', () => {
    expect(shouldRequestOpenAiWebSearchSources('Show sources please')).toBe(true)
  })

  it('does not trigger on normal search questions', () => {
    expect(shouldRequestOpenAiWebSearchSources('Какая сейчас погода в Токио?')).toBe(false)
  })
})

describe('normalizeWebSearchSourceUrl', () => {
  it('removes query string and hash fragments', () => {
    expect(normalizeWebSearchSourceUrl('https://example.com/path?utm_source=openai#section')).toBe(
      'https://example.com/path'
    )
  })
})
