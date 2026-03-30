import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyGismeteoLocationAliases,
  callGismeteoWeatherAnswer,
  extractWeatherLocationQuery,
} from '@/lib/gismeteoWeather'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'

vi.mock('@/lib/proxyFetch', () => ({
  fetchWithProxyFallback: vi.fn(),
}))

describe('applyGismeteoLocationAliases', () => {
  it('maps Питер and close spellings to Санкт-Петербург', () => {
    expect(applyGismeteoLocationAliases('Питер')).toBe('Санкт-Петербург')
    expect(applyGismeteoLocationAliases('в Питере')).toBe('Санкт-Петербург')
    expect(applyGismeteoLocationAliases('Какая погода в Питере?')).toBe('Санкт-Петербург')
    expect(applyGismeteoLocationAliases('спб')).toBe('Санкт-Петербург')
    expect(applyGismeteoLocationAliases('петер')).toBe('Санкт-Петербург')
    expect(applyGismeteoLocationAliases('Красногорск')).toBe('Красногорск')
  })
})

describe('extractWeatherLocationQuery', () => {
  it('extracts St Petersburg and drops temporal tail', () => {
    expect(extractWeatherLocationQuery('tell me the weather in St Petersburg in 3 days')).toBe('St Petersburg')
  })

  it('extracts London from forecast requests with horizon', () => {
    expect(extractWeatherLocationQuery('weather forecast for London next week')).toBe('London')
  })

  it('keeps russian location extraction stable', () => {
    expect(extractWeatherLocationQuery('Какая погода на 3 дня в Санкт-Петербурге?')).toBe('Санкт-Петербурге')
  })
})

describe('callGismeteoWeatherAnswer', () => {
  const mockedFetchWithProxyFallback = vi.mocked(fetchWithProxyFallback)

  beforeEach(() => {
    mockedFetchWithProxyFallback.mockReset()
  })

  it('returns direct current weather from Gismeteo', async () => {
    mockedFetchWithProxyFallback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            meta: { status: true },
            data: [
              {
                id: 11442,
                slug: 'krasnogorsk',
                country: { code: 'RU' },
                translations: { ru: { city: { name: 'Красногорск', nameP: 'в Красногорске' } } },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          '<script>"weather":{"cw":{"description":["Безоблачно"],"humidity":[35],"pressure":[747],"temperatureAir":[15],"temperatureFeelsLike":[16],"windSpeed":[2]},"schema":[]}</script>',
          { status: 200 }
        )
      )

    const result = await callGismeteoWeatherAnswer({
      query: 'Какая погода сейчас в Красногорске?',
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.content).toContain('(i) Сейчас в Красногорске безоблачно.')
    expect(result.content).toContain('Температура +15°C, по ощущениям +16°C.')
    expect(result.content).toContain('Ветер 2 м/с.')
    expect(result.sources).toEqual([
      {
        title: 'Gismeteo: Красногорск',
        url: 'https://www.gismeteo.ru/weather-krasnogorsk-11442/now/',
      },
    ])
  })

  it('returns an evening forecast from todays page', async () => {
    mockedFetchWithProxyFallback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            meta: { status: true },
            data: [
              {
                id: 11442,
                slug: 'krasnogorsk',
                country: { code: 'RU' },
                translations: { ru: { city: { name: 'Красногорск', nameP: 'в Красногорске' } } },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          `
            <div class="widget-row widget-row-datetime-time">
              <div class="row-item"><span>0:00</span></div>
              <div class="row-item"><span>3:00</span></div>
              <div class="row-item"><span>6:00</span></div>
              <div class="row-item"><span>9:00</span></div>
              <div class="row-item"><span>12:00</span></div>
              <div class="row-item"><span>15:00</span></div>
              <div class="row-item"><span>18:00</span></div>
              <div class="row-item"><span>21:00</span></div>
            </div>
            <div class="widget-row widget-row-icon is-important" data-row="icon-tooltip">
              <div class="row-item" data-tooltip="Безоблачно"></div>
              <div class="row-item" data-tooltip="Безоблачно"></div>
              <div class="row-item" data-tooltip="Малооблачно"></div>
              <div class="row-item" data-tooltip="Малооблачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Пасмурно"></div>
            </div>
            <div class="widget-row widget-row-chart widget-row-chart-temperature-air row-with-caption" data-row="temperature-air">
              <div class="chart">
                <div class="values">
                  <div class="value"><temperature-value value="4" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="6" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="8" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="10" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="12" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="11" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="13" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="9" from-unit="c" reactive></temperature-value></div>
                </div>
              </div>
            </div>
          `,
          { status: 200 }
        )
      )

    const result = await callGismeteoWeatherAnswer({
      query: 'Какая погода вечером в Красногорске?',
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.content).toContain('(i) Вечером в Красногорске облачно.')
    expect(result.content).toContain('Температура +13°C.')
    expect(result.sources).toEqual([
      {
        title: 'Gismeteo: Красногорск',
        url: 'https://www.gismeteo.ru/weather-krasnogorsk-11442/',
      },
    ])
  })

  it('uses an override city for short weather follow-ups', async () => {
    mockedFetchWithProxyFallback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            meta: { status: true },
            data: [
              {
                id: 11442,
                slug: 'krasnogorsk',
                country: { code: 'RU' },
                translations: { ru: { city: { name: 'Красногорск', nameP: 'в Красногорске' } } },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          `
            <div class="widget-row widget-row-datetime-time">
              <div class="row-item"><span>0:00</span></div>
              <div class="row-item"><span>3:00</span></div>
              <div class="row-item"><span>6:00</span></div>
              <div class="row-item"><span>9:00</span></div>
              <div class="row-item"><span>12:00</span></div>
              <div class="row-item"><span>15:00</span></div>
              <div class="row-item"><span>18:00</span></div>
              <div class="row-item"><span>21:00</span></div>
            </div>
            <div class="widget-row widget-row-icon is-important" data-row="icon-tooltip">
              <div class="row-item" data-tooltip="Безоблачно"></div>
              <div class="row-item" data-tooltip="Безоблачно"></div>
              <div class="row-item" data-tooltip="Малооблачно"></div>
              <div class="row-item" data-tooltip="Малооблачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Пасмурно"></div>
            </div>
            <div class="widget-row widget-row-chart widget-row-chart-temperature-air row-with-caption" data-row="temperature-air">
              <div class="chart">
                <div class="values">
                  <div class="value"><temperature-value value="4" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="6" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="8" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="10" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="12" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="11" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="13" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="9" from-unit="c" reactive></temperature-value></div>
                </div>
              </div>
            </div>
          `,
          { status: 200 }
        )
      )

    const result = await callGismeteoWeatherAnswer({
      query: 'а вечером',
      locationQueryOverride: 'Красногорск',
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.content).toContain('(i) Вечером в Красногорске')
    expect(result.sources).toEqual([
      {
        title: 'Gismeteo: Красногорск',
        url: 'https://www.gismeteo.ru/weather-krasnogorsk-11442/',
      },
    ])
  })

  it('uses an override city for tomorrow follow-ups', async () => {
    mockedFetchWithProxyFallback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            meta: { status: true },
            data: [
              {
                id: 11442,
                slug: 'krasnogorsk',
                country: { code: 'RU' },
                translations: { ru: { city: { name: 'Красногорск', nameP: 'в Красногорске' } } },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          `
            <div class="widget-row widget-row-tod-date">
              <a class="row-item link link-hover" href="/weather-krasnogorsk-11442/">пн, 30 марта</a>
              <a class="row-item link link-hover" href="/weather-krasnogorsk-11442/tomorrow/">вт, 31 марта</a>
            </div>
            <div class="widget-row widget-row-icon is-important" data-row="icon-tooltip">
              <div class="row-item" data-tooltip="Безоблачно"></div>
              <div class="row-item" data-tooltip="Малооблачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Пасмурно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Малооблачно"></div>
            </div>
            <div class="widget-row widget-row-chart widget-row-chart-temperature-air row-with-caption" data-row="temperature-air">
              <div class="chart">
                <div class="values">
                  <div class="value"><temperature-value value="4" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="6" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="14" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="8" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="5" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="7" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="16" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="11" from-unit="c" reactive></temperature-value></div>
                </div>
              </div>
            </div>
          `,
          { status: 200 }
        )
      )

    const result = await callGismeteoWeatherAnswer({
      query: 'а завтра',
      locationQueryOverride: 'Красногорск',
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.content).toContain('(i) Прогноз на завтра в Красногорске:')
    expect(result.sources).toEqual([
      {
        title: 'Gismeteo: Красногорск',
        url: 'https://www.gismeteo.ru/weather-krasnogorsk-11442/tomorrow/',
      },
    ])
  })

  it('returns a weekend forecast from Gismeteo', async () => {
    mockedFetchWithProxyFallback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            meta: { status: true },
            data: [
              {
                id: 11442,
                slug: 'krasnogorsk',
                country: { code: 'RU' },
                translations: { ru: { city: { name: 'Красногорск', nameP: 'в Красногорске' } } },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          `
            <div class="widget-row widget-row-tod-date">
              <a class="row-item link link-hover" href="/weather-krasnogorsk-11442/5-day/">пт, 3 апреля</a>
              <a class="row-item link-red link-hover" href="/weather-krasnogorsk-11442/6-day/">сб, 4 апреля</a>
              <a class="row-item link-red link-hover" href="/weather-krasnogorsk-11442/7-day/">вс, 5 апреля</a>
            </div>
            <div class="widget-row widget-row-datetime-time">
              <div class="row-item row-item-tod">Ночь</div>
              <div class="row-item row-item-tod">Утро</div>
              <div class="row-item row-item-tod">День</div>
              <div class="row-item row-item-tod">Вечер</div>
              <div class="row-item row-item-tod">Ночь</div>
              <div class="row-item row-item-tod">Утро</div>
              <div class="row-item row-item-tod">День</div>
              <div class="row-item row-item-tod">Вечер</div>
              <div class="row-item row-item-tod">Ночь</div>
              <div class="row-item row-item-tod">Утро</div>
              <div class="row-item row-item-tod">День</div>
              <div class="row-item row-item-tod">Вечер</div>
            </div>
            <div class="widget-row widget-row-icon is-important" data-row="icon-tooltip">
              <div class="row-item" data-tooltip="Пасмурно, небольшой дождь"></div>
              <div class="row-item" data-tooltip="Пасмурно, небольшой дождь"></div>
              <div class="row-item" data-tooltip="Облачно, небольшой дождь"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Малооблачно"></div>
              <div class="row-item" data-tooltip="Малооблачно"></div>
            </div>
            <div class="widget-row widget-row-chart widget-row-chart-temperature-air row-with-caption" data-row="temperature-air">
              <div class="chart">
                <div class="values">
                  <div class="value"><temperature-value value="4" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="8" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="14" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="18" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="5" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="7" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="13" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="17" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="6" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="9" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="12" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="15" from-unit="c" reactive></temperature-value></div>
                </div>
              </div>
            </div>
          `,
          { status: 200 }
        )
      )

    const result = await callGismeteoWeatherAnswer({
      query: 'А в выходные в Красногорске?',
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.content).toContain('(i) Прогноз на выходные в Красногорске:')
    expect(result.content).toContain('3 апреля')
    expect(result.content).toContain('5 апреля')
    expect(result.sources).toEqual([
      {
        title: 'Gismeteo: Красногорск',
        url: 'https://www.gismeteo.ru/weather-krasnogorsk-11442/weekend/',
      },
    ])
  })

  it('returns a multi-day forecast directly from Gismeteo', async () => {
    mockedFetchWithProxyFallback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            meta: { status: true },
            data: [
              {
                id: 11442,
                slug: 'krasnogorsk',
                country: { code: 'RU' },
                translations: { ru: { city: { name: 'Красногорск', nameP: 'в Красногорске' } } },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          `
            <div class="widget-row widget-row-tod-date">
              <a class="row-item link link-hover" href="/weather-krasnogorsk-11442/">пн, 30 марта</a>
              <a class="row-item link link-hover" href="/weather-krasnogorsk-11442/tomorrow/">вт, 31 марта</a>
              <a class="row-item link link-hover" href="/weather-krasnogorsk-11442/3-day/">ср, 1 апреля</a>
            </div>
            <div class="widget-row widget-row-datetime-time">
              <div class="row-item row-item-tod">Ночь</div>
              <div class="row-item row-item-tod">Утро</div>
              <div class="row-item row-item-tod">День</div>
              <div class="row-item row-item-tod">Вечер</div>
              <div class="row-item row-item-tod">Ночь</div>
              <div class="row-item row-item-tod">Утро</div>
              <div class="row-item row-item-tod">День</div>
              <div class="row-item row-item-tod">Вечер</div>
              <div class="row-item row-item-tod">Ночь</div>
              <div class="row-item row-item-tod">Утро</div>
              <div class="row-item row-item-tod">День</div>
              <div class="row-item row-item-tod">Вечер</div>
            </div>
            <div class="widget-row widget-row-icon is-important" data-row="icon-tooltip">
              <div class="row-item" data-tooltip="Малооблачно"></div>
              <div class="row-item" data-tooltip="Безоблачно"></div>
              <div class="row-item" data-tooltip="Безоблачно"></div>
              <div class="row-item" data-tooltip="Малооблачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Пасмурно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
              <div class="row-item" data-tooltip="Облачно"></div>
            </div>
            <div class="widget-row widget-row-chart widget-row-chart-temperature-air row-with-caption" data-row="temperature-air">
              <div class="chart">
                <div class="values">
                  <div class="value"><temperature-value value="4" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="6" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="14" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="8" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="5" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="7" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="16" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="11" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="3" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="5" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="13" from-unit="c" reactive></temperature-value></div>
                  <div class="value"><temperature-value value="9" from-unit="c" reactive></temperature-value></div>
                </div>
              </div>
            </div>
          `,
          { status: 200 }
        )
      )

    const result = await callGismeteoWeatherAnswer({
      query: 'Какая погода на 3 дня в Красногорске?',
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.content).toContain('(i) Прогноз на 3 дня в Красногорске:')
    expect(result.content).toContain('31 марта')
    expect(result.content).toContain('1 апреля')
    expect(result.content).toContain('+4…+14°C')
    expect(result.sources).toEqual([
      {
        title: 'Gismeteo: Красногорск',
        url: 'https://www.gismeteo.ru/weather-krasnogorsk-11442/3-days/',
      },
    ])
  })

  it('prefers the exact Krasnogorsk match over similar cities', async () => {
    mockedFetchWithProxyFallback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            meta: { status: true },
            data: [
              {
                id: 199077,
                slug: 'kakashura',
                country: { code: 'RU' },
                translations: { ru: { city: { name: 'Какашура', nameP: 'в Какашуре' } } },
              },
              {
                id: 11442,
                slug: 'krasnogorsk',
                country: { code: 'RU' },
                translations: { ru: { city: { name: 'Красногорск', nameP: 'в Красногорске' } } },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          '<script>"weather":{"cw":{"description":["Безоблачно"],"humidity":[35],"pressure":[747],"temperatureAir":[15],"temperatureFeelsLike":[16],"windSpeed":[2]},"schema":[]}</script>',
          { status: 200 }
        )
      )

    const result = await callGismeteoWeatherAnswer({
      query: 'Какая сейчас погода в Красногорске?',
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.sources).toEqual([
      {
        title: 'Gismeteo: Красногорск',
        url: 'https://www.gismeteo.ru/weather-krasnogorsk-11442/now/',
      },
    ])
  })

  it('pins Волосово to Клин urban district in Moscow oblast', async () => {
    mockedFetchWithProxyFallback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            meta: { status: true },
            data: [
              {
                id: 4080,
                slug: 'volosovo',
                country: { code: 'RU' },
                district: { slug: 'leningrad-oblast' },
                subdistrict: { slug: 'volosovsky-district' },
                translations: { ru: { city: { name: 'Волосово', nameP: 'в Волосово' } } },
              },
              {
                id: 166961,
                slug: 'volosovo',
                country: { code: 'RU' },
                district: { slug: 'moscow-oblast' },
                subdistrict: { slug: 'klin-urban-district' },
                translations: { ru: { city: { name: 'Волосово', nameP: 'в Волосово' } } },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          '<script>"weather":{"cw":{"description":["Безоблачно"],"humidity":[40],"pressure":[742],"temperatureAir":[12],"temperatureFeelsLike":[12],"windSpeed":[1]},"schema":[]}</script>',
          { status: 200 }
        )
      )

    const result = await callGismeteoWeatherAnswer({
      query: 'Какая погода сейчас в Волосово?',
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.sources).toEqual([
      {
        title: 'Gismeteo: Волосово',
        url: 'https://www.gismeteo.ru/weather-volosovo-166961/now/',
      },
    ])
  })

  it('pins Ногово to Клин urban district in Moscow oblast', async () => {
    mockedFetchWithProxyFallback
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            meta: { status: true },
            data: [
              {
                id: 999001,
                slug: 'nogovo',
                country: { code: 'RU' },
                district: { slug: 'another-oblast' },
                subdistrict: { slug: 'another-district' },
                translations: { ru: { city: { name: 'Ногово', nameP: 'в Ногово' } } },
              },
              {
                id: 167067,
                slug: 'nogovo',
                country: { code: 'RU' },
                district: { slug: 'moscow-oblast' },
                subdistrict: { slug: 'klin-urban-district' },
                translations: { ru: { city: { name: 'Ногово', nameP: 'в Ногово' } } },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          '<script>"weather":{"cw":{"description":["Облачно"],"humidity":[65],"pressure":[739],"temperatureAir":[7],"temperatureFeelsLike":[6],"windSpeed":[3]},"schema":[]}</script>',
          { status: 200 }
        )
      )

    const result = await callGismeteoWeatherAnswer({
      query: 'Какая погода сейчас в Ногово?',
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.sources).toEqual([
      {
        title: 'Gismeteo: Ногово',
        url: 'https://www.gismeteo.ru/weather-nogovo-167067/now/',
      },
    ])
  })
})
