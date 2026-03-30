import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callOpenAiWebSearchAnswer } from '@/lib/openAiWebSearch'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import {
  filterFreshWebSearchSources,
  formatOpenAiWebSearchAnswer,
  isRecencySensitiveRequest,
  isWeatherForecastRequest,
  isWeatherFollowupRequest,
  normalizeWebSearchSourceUrl,
  shouldRequestAllOpenAiWebSearchSources,
  shouldRequestOpenAiWebSearchSources,
  shouldUseOpenAiWebSearch,
} from '@/lib/openAiWebSearchShared'

vi.mock('@/lib/proxyFetch', () => ({
  fetchWithProxyFallback: vi.fn(),
}))

describe('shouldUseOpenAiWebSearch', () => {
  it('detects Russian current-info queries', () => {
    expect(shouldUseOpenAiWebSearch('Какая температура сейчас в Токио?')).toBe(true)
  })

  it('detects explicit internet requests', () => {
    expect(shouldUseOpenAiWebSearch('Посмотри в интернете, что нового в OpenAI')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Найди в интернете, сколько стоит подписка')).toBe(true)
    expect(shouldUseOpenAiWebSearch('найди в интернет про Next.js')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Поищи в интернете про React 19')).toBe(true)
    expect(shouldUseOpenAiWebSearch('поищи, пожалуйста, в интернете отзывы')).toBe(true)
  })

  it('detects English current-info queries', () => {
    expect(shouldUseOpenAiWebSearch('What is the current price of Bitcoin?')).toBe(true)
  })

  it('detects balanced recency phrases in Russian', () => {
    expect(shouldUseOpenAiWebSearch('Какие новости за последнюю неделю?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Что нового по курсу за этот месяц?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Погода как была пару дней назад?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Какие даты текущего чемпионата КХЛ?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Какие даты текущего соревнования Формулы 1?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Какие даты действующего соревнования Формулы 1?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто последний тренер спартака москва')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто последний чемпион россии по футболу')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто нынешний чемпион англии по футболу')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто последний победитель лиги чемпионов')).toBe(true)
    expect(shouldUseOpenAiWebSearch('когда начнутся паводки в России')).toBe(true)
    expect(shouldUseOpenAiWebSearch('когда состоится матч спартак зенит')).toBe(true)
    expect(shouldUseOpenAiWebSearch('какие планы по запуску миссии')).toBe(true)
    expect(shouldUseOpenAiWebSearch('когда следующий матч спартака')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто будущий тренер спартака')).toBe(true)
    expect(shouldUseOpenAiWebSearch('когда ближайший матч спартака')).toBe(true)
  })

  it('detects balanced recency phrases in English', () => {
    expect(shouldUseOpenAiWebSearch("What's new in AI this month?")).toBe(true)
    expect(shouldUseOpenAiWebSearch('Give me up-to-date exchange rate info')).toBe(true)
    expect(shouldUseOpenAiWebSearch('What happened a couple of days ago?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Who is the latest coach of Spartak Moscow?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Who is the last champion of Russia in football?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Who is the current winner of the tournament?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('When will flood season start in Russia?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('What are the plans for the release?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('when is the next match')).toBe(true)
    expect(shouldUseOpenAiWebSearch('who is the upcoming head coach')).toBe(true)
    expect(shouldUseOpenAiWebSearch('upcoming launch date')).toBe(true)
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

  it('detects week/month and freshness phrasing', () => {
    expect(isRecencySensitiveRequest('Новости за последнюю неделю')).toBe(true)
    expect(isRecencySensitiveRequest('Статистика за этот месяц')).toBe(true)
    expect(isRecencySensitiveRequest("what's new this month")).toBe(true)
    expect(isRecencySensitiveRequest('need up to date figures')).toBe(true)
    expect(isRecencySensitiveRequest('Какие даты текущего чемпионата КХЛ?')).toBe(true)
    expect(isRecencySensitiveRequest('Какие даты текущего соревнования Формулы 1?')).toBe(true)
    expect(isRecencySensitiveRequest('Какие даты действующего соревнования Формулы 1?')).toBe(true)
    expect(isRecencySensitiveRequest('когда будет матч открытия сезона')).toBe(true)
    expect(isRecencySensitiveRequest('какие планы по запуску')).toBe(true)
    expect(isRecencySensitiveRequest('когда следующий матч спартака')).toBe(true)
    expect(isRecencySensitiveRequest('who is the upcoming coach')).toBe(true)
    expect(isRecencySensitiveRequest('кто последний чемпион россии по футболу')).toBe(true)
  })

  it('does not trigger on generic questions', () => {
    expect(isRecencySensitiveRequest('Explain present perfect')).toBe(false)
    expect(isRecencySensitiveRequest('Последний урок был сложный')).toBe(false)
    expect(isRecencySensitiveRequest('следующий урок английского')).toBe(false)
    expect(isRecencySensitiveRequest('next exercise please')).toBe(false)
  })
})

describe('isWeatherForecastRequest', () => {
  it('detects weather and forecast phrases', () => {
    expect(isWeatherForecastRequest('Какая погода завтра в Красногорске?')).toBe(true)
    expect(isWeatherForecastRequest('Прогноз на 3 дня для Москвы')).toBe(true)
    expect(isWeatherForecastRequest('А в выходные в Красногорске?')).toBe(true)
    expect(isWeatherForecastRequest('weather forecast for next week')).toBe(true)
    expect(isWeatherForecastRequest('monthly weather forecast for London')).toBe(true)
  })

  it('does not trigger on unrelated horizon phrases', () => {
    expect(isWeatherForecastRequest('Встретимся завтра утром?')).toBe(false)
    expect(isWeatherForecastRequest('Отчёт на неделю готов?')).toBe(false)
  })
})

describe('isWeatherFollowupRequest', () => {
  it('detects short weather follow-ups', () => {
    expect(isWeatherFollowupRequest('а вечером')).toBe(true)
    expect(isWeatherFollowupRequest('вечером')).toBe(true)
    expect(isWeatherFollowupRequest('а завтра')).toBe(true)
    expect(isWeatherFollowupRequest('а ночью')).toBe(true)
    expect(isWeatherFollowupRequest('а утром')).toBe(true)
    expect(isWeatherFollowupRequest('а днём')).toBe(true)
    expect(isWeatherFollowupRequest('а в выходные')).toBe(true)
    expect(isWeatherFollowupRequest('на выходных')).toBe(true)
    expect(isWeatherFollowupRequest('на следующей неделе')).toBe(false)
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

  it('strips ru.wikipedia.org mentions from answer text', () => {
    const result = formatOpenAiWebSearchAnswer({
      answer: 'Последним чемпионом стал Краснодар. (ru.wikipedia.org)',
      sources: [],
      language: 'ru',
    })

    expect(result).toContain('Последним чемпионом стал Краснодар.')
    expect(result).not.toContain('ru.wikipedia.org')
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
    expect(shouldRequestAllOpenAiWebSearchSources('все источники')).toBe(true)
    expect(shouldRequestAllOpenAiWebSearchSources('все ссылки?')).toBe(true)
  })

  it('detects explicit show-all requests in English', () => {
    expect(shouldRequestAllOpenAiWebSearchSources('show all sources')).toBe(true)
  })

  it('does not trigger on normal source request', () => {
    expect(shouldRequestAllOpenAiWebSearchSources('Покажи источники')).toBe(false)
  })
})

describe('callOpenAiWebSearchAnswer', () => {
  const mockedFetchWithProxyFallback = vi.mocked(fetchWithProxyFallback)

  beforeEach(() => {
    mockedFetchWithProxyFallback.mockReset()
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  it('does not add a Gismeteo instruction for non-weather requests', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'Explain the present perfect tense.' }],
      language: 'en',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { instructions?: string }
    expect(body.instructions).not.toContain('https://www.gismeteo.ru/')
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
