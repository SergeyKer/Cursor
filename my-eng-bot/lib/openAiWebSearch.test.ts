import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callOpenAiWebSearchAnswer } from '@/lib/openAiWebSearch'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import {
  compressRussianWebSearchAnswer,
  embellishBareFactsAnswer,
  filterFreshWebSearchSources,
  formatOpenAiWebSearchAnswer,
  hasWebSearchForceCode,
  isNewsQuery,
  isRecencySensitiveRequest,
  isWeatherForecastRequest,
  isWeatherFollowupRequest,
  normalizeWebSearchSourceUrl,
  stripWebSearchForceCode,
  shouldRequestAllOpenAiWebSearchSources,
  shouldRequestOpenAiWebSearchSources,
  shouldUseOpenAiWebSearch,
  isExplicitInternetLookupRequest,
} from '@/lib/openAiWebSearchShared'

vi.mock('@/lib/proxyFetch', () => ({
  fetchWithProxyFallback: vi.fn(),
}))

describe('embellishBareFactsAnswer', () => {
  it('wraps a bare Russian datetime using the city from the user query', () => {
    expect(
      embellishBareFactsAnswer({
        rawAnswer: '31 мар. 2026 г., 03:01:11',
        userQuery: 'сколько времени во владивостоке',
        language: 'ru',
      })
    ).toBe('Во Владивостоке сейчас 31 мар. 2026 г., 03:01:11.')
  })

  it('does not wrap a normal conversational sentence', () => {
    const line = 'Во Владивостоке сейчас около трёх часов ночи по местному времени.'
    expect(
      embellishBareFactsAnswer({
        rawAnswer: line,
        userQuery: 'сколько времени во владивостоке',
        language: 'ru',
      })
    ).toBe(line)
  })
})

describe('shouldUseOpenAiWebSearch', () => {
  it('detects Russian current-info queries', () => {
    expect(shouldUseOpenAiWebSearch('Какая температура сейчас в Токио?')).toBe(true)
  })

  it('detects explicit internet requests', () => {
    expect(shouldUseOpenAiWebSearch('Смотри в интернете, что нового в OpenAI')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Посмотри в интернете, что нового в OpenAI')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Найди в интернете, сколько стоит подписка')).toBe(true)
    expect(shouldUseOpenAiWebSearch('найди в интернет про Next.js')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Поищи в интернете про React 19')).toBe(true)
    expect(shouldUseOpenAiWebSearch('поищи, пожалуйста, в интернете отзывы')).toBe(true)
  })

  it('detects English look/search in internet and web phrasing', () => {
    expect(shouldUseOpenAiWebSearch('Look in the internet for React 19 notes')).toBe(true)
    expect(shouldUseOpenAiWebSearch('look in internet')).toBe(true)
    expect(shouldUseOpenAiWebSearch('search in internet what is new')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Search the web for docs')).toBe(true)
    expect(shouldUseOpenAiWebSearch('looking on the web for hotels')).toBe(true)
    expect(shouldUseOpenAiWebSearch('look in the inretnet for prices')).toBe(true)
    expect(shouldUseOpenAiWebSearch('web search climate data')).toBe(true)
  })

  it('detects English current-info queries', () => {
    expect(shouldUseOpenAiWebSearch('What is the current price of Bitcoin?')).toBe(true)
  })

  it('detects goalkeeper ranking query (рейтинг вратарей) as web-search', () => {
    expect(shouldUseOpenAiWebSearch('рейтинг вратарей')).toBe(true)
    expect(isRecencySensitiveRequest('рейтинг вратарей')).toBe(true)
  })

  it('detects balanced recency phrases in Russian', () => {
    expect(shouldUseOpenAiWebSearch('какие последние новости игр')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Какие новости за последнюю неделю?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Что нового по курсу за этот месяц?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Погода как была пару дней назад?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Какие даты текущего чемпионата КХЛ?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Какие даты текущего соревнования Формулы 1?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Какие даты действующего соревнования Формулы 1?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто последний тренер спартака москва')).toBe(true)
    expect(shouldUseOpenAiWebSearch('последний тренер спартака')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто последний чемпион россии по футболу')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто нынешний чемпион англии по футболу')).toBe(true)
    expect(shouldUseOpenAiWebSearch('последняя модель ниссан')).toBe(true)
    expect(shouldUseOpenAiWebSearch('новая модель тойота')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто последний победитель лиги чемпионов')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто последний обладатель золотого мяча')).toBe(true)
    expect(shouldUseOpenAiWebSearch('последний лауреат нобелевской премии по литературе')).toBe(true)
    expect(shouldUseOpenAiWebSearch('когда начнутся паводки в России')).toBe(true)
    expect(shouldUseOpenAiWebSearch('когда состоится матч спартак зенит')).toBe(true)
    expect(shouldUseOpenAiWebSearch('какие планы по запуску миссии')).toBe(true)
    expect(shouldUseOpenAiWebSearch('когда следующий матч спартака')).toBe(true)
    expect(shouldUseOpenAiWebSearch('когда была последняя игра спартака')).toBe(true)
    expect(shouldUseOpenAiWebSearch('крайняя игра спартака')).toBe(true)
    expect(shouldUseOpenAiWebSearch('прошлый матч спартака')).toBe(true)
    expect(shouldUseOpenAiWebSearch('кто будущий тренер спартака')).toBe(true)
    expect(shouldUseOpenAiWebSearch('когда ближайший матч спартака')).toBe(true)
    expect(shouldUseOpenAiWebSearch('на каком месте по рейтингу сейчас Яшин')).toBe(true)
  })

  it('does not trigger on false-positive news substrings', () => {
    expect(shouldUseOpenAiWebSearch('новостройка рядом с парком')).toBe(false)
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
    expect(shouldUseOpenAiWebSearch('when was the last game of Spartak')).toBe(true)
    expect(shouldUseOpenAiWebSearch('most recent match of Spartak')).toBe(true)
    expect(shouldUseOpenAiWebSearch('previous fixture of Spartak')).toBe(true)
    expect(shouldUseOpenAiWebSearch('who is the upcoming head coach')).toBe(true)
    expect(shouldUseOpenAiWebSearch('upcoming launch date')).toBe(true)
    expect(shouldUseOpenAiWebSearch('what is his ranking now')).toBe(true)
  })

  it('does not trigger on general knowledge', () => {
    expect(shouldUseOpenAiWebSearch('Explain the difference between Present Perfect and Past Simple')).toBe(false)
    expect(shouldUseOpenAiWebSearch('Последний урок был сложный')).toBe(false)
    expect(shouldUseOpenAiWebSearch('когда был последний урок английского')).toBe(false)
    expect(shouldUseOpenAiWebSearch('last english lesson was hard')).toBe(false)
  })

  it('detects prices, year stats, and popularity queries (web search)', () => {
    expect(shouldUseOpenAiWebSearch('сколько стоит бентли')).toBe(true)
    expect(shouldUseOpenAiWebSearch('сколько стоят яблоки в перекрёстке')).toBe(true)
    expect(shouldUseOpenAiWebSearch('самое популярное имя мальчика в 2026 году')).toBe(true)
    expect(shouldUseOpenAiWebSearch('How much does a Bentley cost?')).toBe(true)
  })

  it('detects local time in a city (web search, not model guess)', () => {
    expect(shouldUseOpenAiWebSearch('сколько времени в дубай')).toBe(true)
    expect(shouldUseOpenAiWebSearch('сколько времени в Москве')).toBe(true)
    expect(shouldUseOpenAiWebSearch('сколько времени во Владивостоке')).toBe(true)
    expect(shouldUseOpenAiWebSearch('сколько времени во владивостоке')).toBe(true)
    expect(shouldUseOpenAiWebSearch('какое время в Лондоне')).toBe(true)
    expect(shouldUseOpenAiWebSearch('What time is it in Tokyo?')).toBe(true)
    expect(shouldUseOpenAiWebSearch('current time in Berlin')).toBe(true)
  })

  it('does not treat "how long" duration as a city time query', () => {
    expect(shouldUseOpenAiWebSearch('сколько времени займёт дорога')).toBe(false)
  })

  it('forces web search by code prefix in Russian and English layouts', () => {
    expect(shouldUseOpenAiWebSearch('Иии цены на нефть')).toBe(true)
    expect(shouldUseOpenAiWebSearch('Iii latest OpenAI news')).toBe(true)
    expect(shouldUseOpenAiWebSearch('иИи цены на нефть')).toBe(true)
    expect(shouldUseOpenAiWebSearch('iII latest OpenAI news')).toBe(true)
    expect(hasWebSearchForceCode('Иии цены на нефть')).toBe(true)
    expect(hasWebSearchForceCode('Iii latest OpenAI news')).toBe(true)
    expect(hasWebSearchForceCode('иИи цены на нефть')).toBe(true)
    expect(hasWebSearchForceCode('iII latest OpenAI news')).toBe(true)
  })

  it('strips force code from query before further processing', () => {
    expect(stripWebSearchForceCode('Иии цены на нефть')).toBe('цены на нефть')
    expect(stripWebSearchForceCode('Iii latest OpenAI news')).toBe('latest OpenAI news')
    expect(stripWebSearchForceCode('Иии, что нового в ИИ?')).toBe('что нового в ИИ?')
    expect(stripWebSearchForceCode('иИи: что нового в ИИ?')).toBe('что нового в ИИ?')
  })

  it('does not trigger by code in the middle of sentence', () => {
    expect(shouldUseOpenAiWebSearch('расскажи иии про бананы')).toBe(false)
    expect(shouldUseOpenAiWebSearch('tell me iii about bananas')).toBe(false)
    expect(hasWebSearchForceCode('расскажи иии про бананы')).toBe(false)
    expect(hasWebSearchForceCode('tell me iii about bananas')).toBe(false)
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
    expect(isRecencySensitiveRequest('когда была последняя игра спартака')).toBe(true)
    expect(isRecencySensitiveRequest('крайняя игра спартака')).toBe(true)
    expect(isRecencySensitiveRequest('прошлый матч спартака')).toBe(true)
    expect(isRecencySensitiveRequest('who is the upcoming coach')).toBe(true)
    expect(isRecencySensitiveRequest('when was the last game of Spartak')).toBe(true)
    expect(isRecencySensitiveRequest('most recent match of Spartak')).toBe(true)
    expect(isRecencySensitiveRequest('previous fixture of Spartak')).toBe(true)
    expect(isRecencySensitiveRequest('кто последний чемпион россии по футболу')).toBe(true)
    expect(isRecencySensitiveRequest('кто последний обладатель золотого мяча')).toBe(true)
    expect(isRecencySensitiveRequest('последний тренер спартака')).toBe(true)
    expect(isRecencySensitiveRequest('последняя модель ниссан')).toBe(true)
    expect(isRecencySensitiveRequest('текущий рейтинг вратарей')).toBe(true)
    expect(isRecencySensitiveRequest('what is his current ranking position')).toBe(true)
    expect(isRecencySensitiveRequest('какие новости спорта')).toBe(true)
    expect(isRecencySensitiveRequest('sports news today')).toBe(true)
  })

  it('does not trigger on generic questions', () => {
    expect(isRecencySensitiveRequest('Explain present perfect')).toBe(false)
    expect(isRecencySensitiveRequest('Последний урок был сложный')).toBe(false)
    expect(isRecencySensitiveRequest('следующий урок английского')).toBe(false)
    expect(isRecencySensitiveRequest('next exercise please')).toBe(false)
  })

  it('treats city local time as recency-sensitive for sources', () => {
    expect(isRecencySensitiveRequest('сколько времени в дубай')).toBe(true)
    expect(isRecencySensitiveRequest('What time is it in London?')).toBe(true)
  })
})

describe('isNewsQuery', () => {
  it('detects Russian and English news queries', () => {
    expect(isNewsQuery('какие новости спорта')).toBe(true)
    expect(isNewsQuery('последние новости')).toBe(true)
    expect(isNewsQuery('latest sports news')).toBe(true)
  })

  it('does not trigger for non-news learning prompts', () => {
    expect(isNewsQuery('объясни present perfect')).toBe(false)
    expect(isNewsQuery('новостройка у парка')).toBe(false)
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

  it('strips parenthetical multi-label domains like (rostov.rbc.ru)', () => {
    const result = formatOpenAiWebSearchAnswer({
      answer:
        'Контракт продлён. 6 декабря 2025 года. (rostov.rbc.ru)',
      sources: [],
      language: 'ru',
    })

    expect(result).toContain('Контракт продлён.')
    expect(result).not.toContain('rostov')
    expect(result).not.toContain('rbc.ru')
  })

  it('strips parenthetical punycode domains', () => {
    const result = formatOpenAiWebSearchAnswer({
      answer:
        'Топ-5 имён сохранён. (xn--80aidamjr3akke.xn--p1ai)',
      sources: [],
      language: 'ru',
    })

    expect(result).toContain('Топ-5 имён сохранён.')
    expect(result).not.toContain('xn--80aidamjr3akke.xn--p1ai')
  })

  it('preserves list line breaks for bullet-style output', () => {
    const result = formatOpenAiWebSearchAnswer({
      answer: '- Пункт 1\n- Пункт 2\n- Пункт 3',
      sources: [],
      language: 'ru',
    })

    expect(result).toContain('\n- Пункт 2')
    expect(result.startsWith('(i) - Пункт 1')).toBe(true)
  })
})

describe('isExplicitInternetLookupRequest', () => {
  it('matches explicit Russian/English internet phrasing and force code', () => {
    expect(isExplicitInternetLookupRequest('Посмотри в интернете, какие цвета у Porsche')).toBe(true)
    expect(isExplicitInternetLookupRequest('search online for prices')).toBe(true)
    expect(isExplicitInternetLookupRequest('иии что нового')).toBe(true)
  })

  it('does not match broad current-info triggers without explicit wording', () => {
    expect(isExplicitInternetLookupRequest('Какая температура сейчас в Токио?')).toBe(false)
    expect(isExplicitInternetLookupRequest('Что нового в OpenAI?')).toBe(false)
  })
})

describe('compressRussianWebSearchAnswer', () => {
  it('skips char/sentence limits when skipCompression is true', () => {
    const text = `Это очень длинное предложение без явных пауз которое должно быть аккуратно сокращено по границе слова чтобы не ломать читабельность и не создавать ощущение обрыва в середине важного слова при этом текст специально сделан длиннее лимита символов для нулевого уровня детализации чтобы сработала мягкая обрезка хвоста и чтобы проверка была устойчивой даже если до этого лимит почти достигался в тестовой строке.`
    const out = compressRussianWebSearchAnswer({ answer: text, detailLevel: 0, skipCompression: true })
    expect(out).toBe(text)
  })

  it('keeps short text unchanged for detail level 0', () => {
    const text = 'В Токио сейчас +18°C. Днём без осадков.'
    expect(compressRussianWebSearchAnswer({ answer: text, detailLevel: 0 })).toBe(text)
  })

  it('limits to three sentences for detail level 0', () => {
    const text =
      'Сегодня рынок вырос на 1%. Индекс достиг локального максимума. Объёмы торгов выше среднего. Основной драйвер — отчётность крупных компаний. Завтра ожидается волатильность.'
    const out = compressRussianWebSearchAnswer({ answer: text, detailLevel: 0 })
    expect(out).toBe('Сегодня рынок вырос на 1%. Индекс достиг локального максимума. Объёмы торгов выше среднего.')
  })

  it('keeps up to five sentences for detail level 1', () => {
    const text =
      'Пункт один. Пункт два. Пункт три. Пункт четыре. Пункт пять. Пункт шесть.'
    const out = compressRussianWebSearchAnswer({ answer: text, detailLevel: 1 })
    expect(out).toBe('Пункт один. Пункт два. Пункт три. Пункт четыре. Пункт пять.')
  })

  it('clamps long single sentence by word boundary', () => {
    const text = `Это очень длинное предложение без явных пауз которое должно быть аккуратно сокращено по границе слова чтобы не ломать читабельность и не создавать ощущение обрыва в середине важного слова при этом текст специально сделан длиннее лимита символов для нулевого уровня детализации чтобы сработала мягкая обрезка хвоста и чтобы проверка была устойчивой даже если до этого лимит почти достигался в тестовой строке.`
    const out = compressRussianWebSearchAnswer({ answer: text, detailLevel: 0 })
    expect(out.length).toBeLessThanOrEqual(323)
    expect(out.length).toBeLessThan(text.length)
  })

  it('keeps full bullet lines for multiline list digest', () => {
    const text = [
      'Вот краткая сводка:',
      '- Футбол: Динамо выиграло домашний матч со счётом 2:1.',
      '- Бокс: Чисора анонсировал следующий бой на осень.',
      '- Теннис: Шнайдер вышла в финал турнира в Штутгарте.',
      '- Формула-1: Команды подтвердили обновления к следующему этапу.',
    ].join('\n')

    const out = compressRussianWebSearchAnswer({ answer: text, detailLevel: 0 })
    expect(out).not.toContain('Вот краткая сводка:')
    expect(out).toContain('- Футбол: Динамо выиграло домашний матч со счётом 2:1.')
    expect(out).toContain('- Бокс: Чисора анонсировал следующий бой на осень.')
    expect(out).not.toContain('- Теннис: Шнайдер вышла в финал турнира в Штутгарте.')
    expect(out).not.toContain('Формула-1')
  })

  it('handles inline list-like bullets without breaking items', () => {
    const text =
      'Новости дня: - Футбол: Динамо победило 2:1. - Бокс: Чисора вернётся осенью. - Теннис: финал в Штутгарте. - Формула-1: новые обновления к этапу.'

    const out = compressRussianWebSearchAnswer({ answer: text, detailLevel: 0 })
    expect(out).toContain('- Футбол: Динамо победило 2:1.')
    expect(out).toContain('- Бокс: Чисора вернётся осенью.')
    expect(out).not.toContain('- Теннис: финал в Штутгарте.')
    expect(out).not.toContain('Формула-1')
  })

  it('keeps list digest concise for detail level 0', () => {
    const text = [
      'Вот некоторые из последних новостей интернета:',
      '- Отключения интернета: В России наблюдаются регулярные отключения мобильного и стационарного интернета, в ряде регионов ограничивают доступ к сервисам.',
      '- Белые списки: В Москве активировали белые списки сайтов, чтобы сохранить доступ к ограниченному перечню ресурсов во время отключений.',
      '- Меры регулирования: Также обсуждаются новые требования для операторов связи и платформ.',
    ].join('\n')

    const out = compressRussianWebSearchAnswer({ answer: text, detailLevel: 0 })
    const bullets = out.split('\n').filter((line) => /^[-*•]\s+/.test(line))
    expect(bullets.length).toBeLessThanOrEqual(2)
    expect(out).not.toContain('Вот некоторые из последних новостей интернета:')
    expect(out.length).toBeLessThanOrEqual(250)
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

  it('adds strict low-level child adaptation instructions', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'What is today news?' }],
      language: 'en',
      level: 'a1',
      audience: 'child',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { instructions?: string }
    expect(body.instructions).toContain('Learner profile adaptation (strict for web-search summarization):')
    expect(body.instructions).toContain('Respect fixed CEFR level ceiling: A1.')
    expect(body.instructions).toContain('Audience is CHILD')
    expect(body.instructions).toContain('For starter/A1/A2: use only very common words')
    expect(body.instructions).toContain('compact digest: 3-5 short bullet points')
  })

  it('does not add learner profile adaptation block for russian web-search replies', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'какие последние новости?' }],
      language: 'ru',
      level: 'a1',
      audience: 'child',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { instructions?: string }
    expect(body.instructions).not.toContain('Learner profile adaptation (strict for web-search summarization):')
    expect(body.instructions).not.toContain('Respect fixed CEFR level ceiling:')
    expect(body.instructions).not.toContain('For starter/A1/A2: use only very common words')
  })

  it('does not force news digest format for non-news queries', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'Explain present perfect simply' }],
      language: 'en',
      level: 'a1',
      audience: 'adult',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { instructions?: string }
    expect(body.instructions).not.toContain('compact digest: 3-5 short bullet points')
  })

  it('adds adaptive instruction for level all', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'Tell me latest AI news' }],
      language: 'en',
      level: 'all',
      audience: 'adult',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { instructions?: string }
    expect(body.instructions).toContain('Level mode "all": adapt to the learner language complexity from this chat')
    expect(body.instructions).toContain('Audience is ADULT')
  })

  it('adds expanded news summary instruction for russian news queries', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'какие последние новости в москве' }],
      language: 'ru',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { instructions?: string }
    expect(body.instructions).toContain('развёрнутую сводку')
    expect(body.instructions).toContain('web-search')
    expect(body.instructions).toContain('пустых вводных')
  })

  it('adds current date in instructions using provided timezone', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-04-06T00:30:00.000Z'))
      mockedFetchWithProxyFallback.mockResolvedValueOnce(
        new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
      )

      await callOpenAiWebSearchAnswer({
        systemPrompt: 'You are helpful.',
        messages: [{ role: 'user', content: 'latest sports news' }],
        language: 'en',
        timezone: 'America/Los_Angeles',
      })

      const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
      const body = JSON.parse(String(requestInit?.body)) as { instructions?: string }
      expect(body.instructions).toContain('Current date for freshness checks: 2026-04-05')
    } finally {
      vi.useRealTimers()
    }
  })

  it('sends only latest user query to web search input', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [
        { role: 'assistant', content: 'Здравствуйте! Рад вас видеть. Чем займёмся сегодня?' },
        { role: 'user', content: 'рейтинг дистрибьюторов спецодежды в 2025 году' },
      ],
      language: 'ru',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { input?: string }
    expect(body.input).toBe('рейтинг дистрибьюторов спецодежды в 2025 году')
  })

  it('keeps previous query context for short follow-up with force code', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [
        { role: 'user', content: 'рейтинг дистрибьюторов спецодежды в 2025 году' },
        { role: 'assistant', content: '(i) Нашёл данные, уточните период.' },
        { role: 'user', content: 'иии а в 2024 году' },
      ],
      language: 'ru',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { input?: string }
    expect(body.input).toContain('Previous query: рейтинг дистрибьюторов спецодежды в 2025 году')
    expect(body.input).toContain('Follow-up: а в 2024 году')
  })

  it('keeps previous query context for short entity follow-up', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [
        { role: 'user', content: 'кто был тренером спартака в 2023' },
        { role: 'assistant', content: '(i) Нашёл данные по Спартаку.' },
        { role: 'user', content: 'иии а динамо' },
      ],
      language: 'ru',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { input?: string }
    expect(body.input).toContain('Previous query: кто был тренером спартака в 2023')
    expect(body.input).toContain('Follow-up: а динамо')
  })

  it('uses previous meaningful query for ru detail-only follow-up', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [
        { role: 'user', content: 'последняя модель porsche cayenne' },
        { role: 'assistant', content: '(i) Нашёл свежие данные.' },
        { role: 'user', content: 'подробнее' },
      ],
      language: 'ru',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { input?: string }
    expect(body.input).toContain('Previous query: последняя модель porsche cayenne')
    expect(body.input).toContain('Follow-up: нужно больше деталей по предыдущему вопросу')
  })

  it('uses previous meaningful query for en detail-only follow-up', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(JSON.stringify({ output_text: 'General answer.' }), { status: 200 })
    )

    await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [
        { role: 'user', content: 'latest porsche cayenne model' },
        { role: 'assistant', content: '(i) Here is the latest info.' },
        { role: 'user', content: 'even more details' },
      ],
      language: 'en',
    })

    const [, requestInit] = mockedFetchWithProxyFallback.mock.calls[0] ?? []
    const body = JSON.parse(String(requestInit?.body)) as { input?: string }
    expect(body.input).toContain('Previous query: latest porsche cayenne model')
    expect(body.input).toContain('Follow-up: need more details on the previous query')
  })

  it('strips greeting at start of web-search answer', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          output_text:
            'Здравствуйте! Обновленный Nissan X-Trail 2024 года получил изменения в дизайне и оснащении.',
        }),
        { status: 200 }
      )
    )

    const result = await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'иии про ниссан икстрейл обновленная версия' }],
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.content.toLowerCase()).not.toContain('здравствуйте')
      expect(result.content).toContain('Nissan X-Trail')
    }
  })

  it('strips Russian "Привет" greeting at start of web-search answer', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          output_text: 'Привет! Вот последние новости спорта: - Футбол: матч перенесли.',
        }),
        { status: 200 }
      )
    )

    const result = await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'какие новости спорта' }],
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.content.toLowerCase()).not.toContain('привет')
      expect(result.content).toContain('новости спорта')
    }
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

  it('uses stricter 14-day window for news when requested', () => {
    const result = filterFreshWebSearchSources(
      [
        { title: 'News 2026-03-20', url: 'https://example.com/old-news' },
        { title: 'News 2026-04-05', url: 'https://example.com/fresh-news' },
      ],
      { now: new Date('2026-04-06T00:00:00.000Z'), maxAgeDays: 14 }
    )

    expect(result.hiddenCount).toBe(1)
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0]?.url).toBe('https://example.com/fresh-news')
  })
})
