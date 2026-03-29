import { describe, expect, it } from 'vitest'
import {
  filterFreshWebSearchSources,
  formatOpenAiWebSearchAnswer,
  isRecencySensitiveRequest,
  normalizeWebSearchSourceUrl,
  shouldRequestAllOpenAiWebSearchSources,
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

describe('isRecencySensitiveRequest', () => {
  it('detects now/today style requests', () => {
    expect(isRecencySensitiveRequest('Какая погода сейчас в Москве?')).toBe(true)
    expect(isRecencySensitiveRequest('what is the latest BTC price today')).toBe(true)
  })

  it('does not trigger on generic questions', () => {
    expect(isRecencySensitiveRequest('Explain present perfect')).toBe(false)
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

  it('keeps only Celsius when Fahrenheit is present', () => {
    const result = formatOpenAiWebSearchAnswer({
      answer: 'Сейчас ясно, 45°F (7°C). Завтра около 50°F.',
      sources: [],
      language: 'ru',
    })

    expect(result).toContain('7°C')
    expect(result).not.toContain('°F')
  })

  it('strips inline source links from answer text', () => {
    const result = formatOpenAiWebSearchAnswer({
      answer:
        'Цена около 100 рублей. ([coffeemag.ru](https://www.coffeemag.ru/product/shebekinskaya?utm_source=openai))',
      sources: [],
      language: 'ru',
    })

    expect(result).toContain('Цена около 100 рублей.')
    expect(result).not.toContain('http')
    expect(result).not.toContain('coffeemag.ru')
  })
})

describe('shouldRequestOpenAiWebSearchSources', () => {
  it('detects explicit source requests in Russian', () => {
    expect(shouldRequestOpenAiWebSearchSources('Покажи источники')).toBe(true)
    expect(shouldRequestOpenAiWebSearchSources('Дай источник')).toBe(true)
    expect(shouldRequestOpenAiWebSearchSources('Где источника?')).toBe(true)
  })

  it('detects explicit source requests in English', () => {
    expect(shouldRequestOpenAiWebSearchSources('Show sources please')).toBe(true)
    expect(shouldRequestOpenAiWebSearchSources('source?')).toBe(true)
  })

  it('does not trigger on normal search questions', () => {
    expect(shouldRequestOpenAiWebSearchSources('Какая сейчас погода в Токио?')).toBe(false)
  })
})

describe('shouldRequestAllOpenAiWebSearchSources', () => {
  it('detects explicit show-all requests in Russian', () => {
    expect(shouldRequestAllOpenAiWebSearchSources('Покажи все источники')).toBe(true)
    expect(shouldRequestAllOpenAiWebSearchSources('покажи все')).toBe(true)
  })

  it('detects explicit show-all requests in English', () => {
    expect(shouldRequestAllOpenAiWebSearchSources('show all sources')).toBe(true)
  })

  it('does not trigger on normal source request', () => {
    expect(shouldRequestAllOpenAiWebSearchSources('Покажи источники')).toBe(false)
  })
})

describe('normalizeWebSearchSourceUrl', () => {
  it('removes query string and hash fragments', () => {
    expect(normalizeWebSearchSourceUrl('https://example.com/path?utm_source=openai#section')).toBe(
      'https://example.com/path'
    )
  })
})

describe('filterFreshWebSearchSources', () => {
  it('hides clearly old dated sources', () => {
    const result = filterFreshWebSearchSources(
      [
        { title: 'News 2020-01-02', url: 'https://example.com/old' },
        { title: 'Weather 2026-03-25', url: 'https://example.com/new' },
      ],
      { now: new Date('2026-03-30T00:00:00.000Z'), maxAgeDays: 120 }
    )

    expect(result.hiddenCount).toBe(1)
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0]?.url).toBe('https://example.com/new')
  })
})
