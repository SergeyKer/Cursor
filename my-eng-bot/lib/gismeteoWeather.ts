import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import { formatOpenAiWebSearchAnswer, normalizeWebSearchSourceUrl, type WebSearchSource } from '@/lib/openAiWebSearchShared'

type SearchLanguage = 'ru' | 'en'

type GismeteoCity = {
  id: number
  slug: string
  country?: {
    code?: string
  }
  district?: {
    slug?: string
  }
  subdistrict?: {
    slug?: string
  }
  translations?: {
    ru?: {
      city?: {
        name?: string
        nameP?: string
      }
    }
  }
}

type GismeteoCitySearchResponse = {
  meta?: {
    status?: boolean
  }
  data?: GismeteoCity[]
}

type WeatherPeriod = 'now' | 'today' | 'tomorrow' | 'weekend' | '3-days' | 'weekly' | 'month'
type WeatherTimeSlot = 'night' | 'morning' | 'day' | 'evening'

type WeatherQueryContext = {
  period: WeatherPeriod
  timeSlot?: WeatherTimeSlot
}

const GISMETEO_BASE_URL = 'https://www.gismeteo.ru'
const GISMETEO_PINNED_CITY_BY_QUERY: Record<string, { id: number; districtSlug: string; subdistrictSlug: string }> = {
  волосово: { id: 166961, districtSlug: 'moscow-oblast', subdistrictSlug: 'klin-urban-district' },
  ногово: { id: 167067, districtSlug: 'moscow-oblast', subdistrictSlug: 'klin-urban-district' },
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function normalizeLetters(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '')
}

function transliterateToLatin(text: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }

  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
}

function stripCommonLocationEnding(text: string): string {
  const endings = [
    'иями',
    'ями',
    'ами',
    'ого',
    'его',
    'ому',
    'ему',
    'ыми',
    'ими',
    'иях',
    'ах',
    'ях',
    'ом',
    'ем',
    'ою',
    'ею',
    'ой',
    'ей',
    'ий',
    'ый',
    'ая',
    'яя',
    'ое',
    'ее',
    'ые',
    'ие',
    'ую',
    'юю',
    'ов',
    'ев',
    'ам',
    'ям',
    'ах',
    'ях',
    'а',
    'я',
    'е',
    'у',
    'ю',
    'ы',
    'и',
    'o',
    'e',
    'u',
    'y',
    's',
  ]

  let next = text.trim()
  for (const ending of endings) {
    if (next.length > ending.length + 3 && next.endsWith(ending)) {
      next = next.slice(0, -ending.length)
      break
    }
  }
  return next
}

function buildQueryVariants(text: string): string[] {
  const normalized = normalizeLetters(text)
  const transliterated = transliterateToLatin(normalized)
  const variants = [
    normalized,
    stripCommonLocationEnding(normalized),
    transliterated,
    stripCommonLocationEnding(transliterated),
  ]

  return Array.from(new Set(variants.filter(Boolean)))
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const rows = Array.from({ length: a.length + 1 }, (_, row) => row)
  for (let i = 1; i <= b.length; i += 1) {
    let prev = rows[0]!
    rows[0] = i
    for (let j = 1; j <= a.length; j += 1) {
      const temp = rows[j]!
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      rows[j] = Math.min(rows[j] + 1, rows[j - 1]! + 1, prev + cost)
      prev = temp
    }
  }

  return rows[a.length] ?? Math.max(a.length, b.length)
}

const SPB_LEVENSHTEIN_TARGET = 'питер'

const SPB_ALIAS_KEYS = new Set(
  [
    'питер',
    'питере',
    'питеру',
    'питером',
    'петер',
    'спб',
    'piter',
  ].map((s) => normalizeLetters(s))
)

const MOSCOW_ALIAS_KEYS = new Set(
  ['москва', 'москве', 'москву', 'москвой', 'москвы', 'moscow', 'moskva'].map((s) => normalizeLetters(s))
)

/**
 * Разговорные и близкие к «Питеру» запросы для поиска города на Gismeteo.
 */
export function applyGismeteoLocationAliases(query: string): string {
  const t = normalizeText(query)
  if (!t) return t
  const tailMatch = t.match(/(?:^|\s)(?:в|во|для|по)\s+(.+)$/i)
  const core = (tailMatch?.[1] ?? t).trim()
  const key = normalizeLetters(core)
  const stem = stripCommonLocationEnding(key)
  const candidates = Array.from(new Set([key, stem].filter(Boolean)))
  for (const c of candidates) {
    if (SPB_ALIAS_KEYS.has(c)) return 'Санкт-Петербург'
  }
  for (const c of candidates) {
    if (MOSCOW_ALIAS_KEYS.has(c)) return 'Москва'
  }
  for (const c of candidates) {
    if (c.length >= 4 && c.length <= 7 && levenshteinDistance(c, SPB_LEVENSHTEIN_TARGET) <= 1) {
      return 'Санкт-Петербург'
    }
  }
  return t
}

/** Район/аэропорт внутри города: «Москва (Внуково)» — не основная карточка. */
function parentheticalQualifierPenalty(city: GismeteoCity): number {
  const name = city.translations?.ru?.city?.name ?? ''
  return /\([^)]+\)/.test(name) ? 1 : 0
}

/**
 * Одноимённые «Москва» в регионах — после точного совпадения имени предпочитаем федеральный город.
 */
function moscowHomonymPenalty(city: GismeteoCity): number {
  const name = normalizeLetters(city.translations?.ru?.city?.name?.trim() || '')
  if (name !== 'москва') return 0
  if (city.district?.slug === 'moscow') return 0
  return 1
}

function scoreCityMatch(queryVariants: string[], city: GismeteoCity): { priority: number; score: number } {
  const cityName = normalizeLetters(city.translations?.ru?.city?.name?.trim() || city.slug)
  const cityNameLat = transliterateToLatin(cityName)
  const citySlug = normalizeLetters(city.slug)
  const citySlugLat = transliterateToLatin(citySlug)
  const fields = [cityName, cityNameLat, citySlug, citySlugLat]

  for (const variant of queryVariants) {
    if (fields.includes(variant)) {
      return { priority: 0, score: 0 }
    }
  }

  for (const variant of queryVariants) {
    for (const field of fields) {
      if (field.includes(variant) || variant.includes(field)) {
        return { priority: 1, score: 0 }
      }
    }
  }

  const distances = queryVariants.flatMap((variant) => [
    levenshteinDistance(variant, cityName),
    levenshteinDistance(variant, cityNameLat),
    levenshteinDistance(variant, citySlug),
    levenshteinDistance(variant, citySlugLat),
  ])

  return { priority: 2, score: Math.min(...distances) }
}

function fetchText(url: string): Promise<Response> {
  return fetchWithProxyFallback(url, {}, { directFirst: true })
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetchText(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch JSON: ${res.status}`)
  }
  return (await res.json()) as T
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetchText(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch HTML: ${res.status}`)
  }
  return await res.text()
}

/** Сообщение только про «тему погоды» без названия места (в т.ч. кириллица: \b в RegExp ненадёжен). */
function isBareWeatherTopicWithoutPlaceName(text: string): boolean {
  const n = normalizeText(text).toLowerCase()
  if (!n) return true
  if (/^(weather|forecast|temperature|wheather|whether)$/i.test(n)) return true
  if (/^погод[а-яё]{0,4}$/.test(n)) return true
  if (/^температур[а-яё]{0,4}$/.test(n)) return true
  if (/^прогноз(?:\s+погоды)?$/.test(n)) return true
  return false
}

export function extractWeatherLocationQuery(text: string): string | null {
  const normalized = normalizeText(text)
  if (!normalized) return null

  const weatherNoisePattern =
    /\b(?:сейчас|сегодня|завтра|послезавтра|weather|forecast|прогноз(?:\s+погоды)?|погода|температур[а-яё]*|current|today|tomorrow|next\s+week|next\s+month|на\s+3\s*дн(?:я|ей)|на\s+недел(?:ю|е)|на\s+месяц)\b/gi
  const temporalTailPattern =
    /\b(?:in\s+\d+\s*(?:days?|weeks?|months?)|next\s+\d+\s*(?:days?|weeks?|months?)|in\s+\d+\s*(?:дн(?:я|ей)|недел[юи]|месяц(?:а|е)?)|через\s+\d+\s*(?:дн(?:я|ей)|недел[юи]|месяц(?:а|ев)?))\b/gi
  const trailingConnectorPattern = /(?:\s+(?:в|для|по|на|in|for|at|on|to))+\s*$/i

  const normalizeLocationCandidate = (value: string): string => {
    return normalizeText(
      value
        .replace(weatherNoisePattern, ' ')
        .replace(temporalTailPattern, ' ')
        .replace(/[,.!?;:]+/g, ' ')
        .replace(/^(?:the|a|an)\s+/i, '')
        .replace(trailingConnectorPattern, ' ')
    )
  }

  const tailMatch = normalized.match(/(?:^|\s)(?:в|для|по|in|for)\s+(.+)$/i)
  if (tailMatch?.[1]) {
    const candidate = normalizeLocationCandidate(tailMatch[1])
    if (candidate) return normalizeText(candidate)
  }

  const cleaned = normalizeLocationCandidate(
    normalized
    .replace(/\b(?:какая|какой|какое|какие|какова|what\s+is|what's|what\s+will\s+be)\b/gi, ' ')
  )

  if (cleaned && isBareWeatherTopicWithoutPlaceName(cleaned)) return null

  return cleaned || null
}

function detectWeatherPeriod(text: string): WeatherPeriod {
  const normalized = normalizeText(text).toLowerCase()
  if (/(на\s+месяц|monthly|next\s+month|30\s*дн)/i.test(normalized)) return 'month'
  if (/(выходн(?:ые|ых|ым|ыми|ах|ам|ую)?|weekend)/i.test(normalized)) return 'weekend'
  if (/(на\s+недел|weekly|next\s+week)/i.test(normalized)) return 'weekly'
  if (/(на\s+3\s*дн|3\s*дн|3-day|3\s*days?)/i.test(normalized)) return '3-days'
  if (/(завтра|tomorrow)/i.test(normalized)) return 'tomorrow'
  return 'now'
}

function detectWeatherTimeSlot(text: string): WeatherTimeSlot | null {
  const normalized = normalizeText(text).toLowerCase()
  if (/(ноч[ьюи]|ночь|at\s+night|night)/i.test(normalized)) return 'night'
  if (/(утром|утро|morning)/i.test(normalized)) return 'morning'
  if (/(дн[её]м|днем|день|daytime)/i.test(normalized)) return 'day'
  if (/(вечером|вечер|evening)/i.test(normalized)) return 'evening'
  return null
}

function detectWeatherQueryContext(text: string): WeatherQueryContext {
  const period = detectWeatherPeriod(text)
  const timeSlot = detectWeatherTimeSlot(text)

  if (period === 'month' || period === 'weekly' || period === '3-days') {
    return { period }
  }

  if (timeSlot) {
    return {
      period: period === 'tomorrow' ? 'tomorrow' : 'today',
      timeSlot,
    }
  }

  return { period }
}

function buildWeatherPageUrl(city: GismeteoCity, period: WeatherPeriod): string {
  const base = `${GISMETEO_BASE_URL}/weather-${city.slug}-${city.id}`
  switch (period) {
    case 'today':
      return `${base}/`
    case 'tomorrow':
      return `${base}/tomorrow/`
    case 'weekend':
      return `${base}/weekend/`
    case '3-days':
      return `${base}/3-days/`
    case 'weekly':
      return `${base}/weekly/`
    case 'month':
      return `${base}/month/`
    case 'now':
    default:
      return `${base}/now/`
  }
}

function extractCurrentWeatherSummary(html: string): {
  description: string
  temperatureAir: number
  temperatureFeelsLike: number
  humidity?: number
  pressure?: number
  windSpeed?: number
} {
  const match = html.match(/"weather":\{"cw":(\{[\s\S]*?\})\,"schema":\[/)
  if (!match?.[1]) {
    throw new Error('Current weather block not found')
  }

  const data = JSON.parse(match[1]) as {
    description?: string[]
    temperatureAir?: number[]
    temperatureFeelsLike?: number[]
    humidity?: number[]
    pressure?: number[]
    windSpeed?: number[]
  }

  const temperatureAir = data.temperatureAir?.[0]
  const temperatureFeelsLike = data.temperatureFeelsLike?.[0]
  const description = data.description?.[0]

  if (typeof temperatureAir !== 'number' || typeof temperatureFeelsLike !== 'number' || typeof description !== 'string') {
    throw new Error('Current weather data is incomplete')
  }

  return {
    description,
    temperatureAir,
    temperatureFeelsLike,
    humidity: data.humidity?.[0],
    pressure: data.pressure?.[0],
    windSpeed: data.windSpeed?.[0],
  }
}

function extractBlock(html: string, startMarker: string, endMarkers: string[]): string {
  const start = html.indexOf(startMarker)
  if (start < 0) return ''

  let end = html.length
  for (const marker of endMarkers) {
    const candidate = html.indexOf(marker, start + startMarker.length)
    if (candidate >= 0 && candidate < end) {
      end = candidate
    }
  }

  return html.slice(start, end)
}

function extractDateLabels(html: string): Array<{ label: string; href: string }> {
  const block = extractBlock(html, 'widget-row widget-row-tod-date"', ['widget-row widget-row-datetime-time"'])
  const matches = Array.from(
    block.matchAll(/<a class="row-item link(?:-red)? link-hover"[^>]*href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>/g)
  )
  return matches
    .map((match) => ({
      href: decodeHtmlEntities(match[1] ?? '').trim(),
      label: stripTags(match[2] ?? ''),
    }))
    .filter((entry) => entry.href && entry.label)
}

function extractTooltipLabels(html: string): string[] {
  const block = extractBlock(
    html,
    'widget-row widget-row-icon',
    ['widget-row widget-row-chart widget-row-chart-temperature-air', 'widget-row widget-row-chart widget-row-chart-pressure']
  )
  return Array.from(block.matchAll(/data-tooltip="([^"]+)"/g))
    .map((match) => stripTags(match[1] ?? ''))
    .filter(Boolean)
}

function extractTemperatureValues(html: string): number[] {
  const block = extractBlock(
    html,
    'widget-row widget-row-chart widget-row-chart-temperature-air',
    ['widget-row widget-row-chart widget-row-chart-heat-index', 'widget-row widget-row-chart widget-row-chart-pressure']
  )
  return Array.from(block.matchAll(/<temperature-value value="(-?\d+)"/g))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value))
}

function extractTimeLabels(html: string): string[] {
  const block = extractBlock(
    html,
    'widget-row widget-row-datetime-time"',
    ['widget-row widget-row-icon', 'widget-row widget-row-chart widget-row-chart-temperature-air']
  )
  return Array.from(block.matchAll(/<span>\s*(\d{1,2}:\d{2})\s*<\/span>/g))
    .map((match) => match[1] ?? '')
    .filter(Boolean)
}

function pickDominantDescription(values: string[]): string {
  const counts = new Map<string, number>()
  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) continue
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }

  let best = ''
  let bestCount = 0
  for (const [value, count] of Array.from(counts.entries())) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }

  return best
}

function parseHourLabel(label: string): number | null {
  const match = label.match(/^(\d{1,2}):\d{2}$/)
  if (!match?.[1]) return null
  const hour = Number(match[1])
  return Number.isFinite(hour) ? hour : null
}

function chooseSlotIndex(timeLabels: string[], timeSlot: WeatherTimeSlot): number {
  const preferredHours: Record<WeatherTimeSlot, number[]> = {
    night: [3, 0],
    morning: [6, 9],
    day: [12, 15],
    evening: [18, 21],
  }

  const hours = timeLabels.map(parseHourLabel)
  for (const targetHour of preferredHours[timeSlot]) {
    const exactIndex = hours.findIndex((hour) => hour === targetHour)
    if (exactIndex >= 0) return exactIndex
  }

  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < hours.length; index += 1) {
    const hour = hours[index]
    if (hour === null) continue
    const distance = Math.min(...preferredHours[timeSlot].map((targetHour) => Math.abs(hour - targetHour)))
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  return bestIndex
}

function buildSlotWeatherLabel(period: WeatherPeriod, timeSlot: WeatherTimeSlot, language: SearchLanguage): string {
  if (language === 'en') {
    const slotLabel: Record<WeatherTimeSlot, string> = {
      night: period === 'tomorrow' ? 'Tomorrow night' : 'Tonight',
      morning: period === 'tomorrow' ? 'Tomorrow morning' : 'This morning',
      day: period === 'tomorrow' ? 'Tomorrow during the day' : 'Today during the day',
      evening: period === 'tomorrow' ? 'Tomorrow evening' : 'This evening',
    }
    return slotLabel[timeSlot]
  }

  const slotLabel: Record<WeatherTimeSlot, string> = {
    night: 'Ночью',
    morning: 'Утром',
    day: 'Днём',
    evening: 'Вечером',
  }

  if (period === 'tomorrow') {
    return `Завтра ${slotLabel[timeSlot].toLowerCase()}`
  }
  return slotLabel[timeSlot]
}

function buildSlotWeatherAnswer(
  cityLocation: string,
  period: WeatherPeriod,
  timeSlot: WeatherTimeSlot,
  html: string,
  language: SearchLanguage
): string {
  const timeLabels = extractTimeLabels(html)
  const descriptions = extractTooltipLabels(html)
  const temperatures = extractTemperatureValues(html)

  if (timeLabels.length === 0 || descriptions.length === 0 || temperatures.length === 0) {
    throw new Error('Forecast data is missing')
  }

  const slotIndex = chooseSlotIndex(timeLabels, timeSlot)
  const description = translateWeatherDescription(descriptions[slotIndex] ?? '', language).toLowerCase()
  const temperature = temperatures[slotIndex]

  if (typeof temperature !== 'number') {
    throw new Error('Forecast slot data is incomplete')
  }

  const tempLabel = `${temperature > 0 ? '+' : ''}${temperature}°C`
  const label = buildSlotWeatherLabel(period, timeSlot, language)

  if (language === 'en') {
    const slotSentence = `${label} in ${cityLocation} it will be ${description}.`
    return `${slotSentence} Temperature is ${tempLabel}.`
  }

  const slotSentence = `${label} ${cityLocation} ${description}.`
  return `${slotSentence} Температура ${tempLabel}.`
}

function translateWeatherDescription(description: string, language: SearchLanguage): string {
  if (language !== 'en') return description

  const normalized = description.trim().toLowerCase()
  const dictionary: Record<string, string> = {
    'безоблачно': 'clear',
    'малооблачно': 'partly cloudy',
    'облачно': 'cloudy',
    'пасмурно': 'overcast',
    'переменная облачность': 'partly cloudy',
    'облачно, туман': 'cloudy, fog',
    'облачно, дождь': 'cloudy, rain',
    'облачно, снег': 'cloudy, snow',
    'дождь': 'rain',
    'ливни': 'showers',
    'снег': 'snow',
    'туман': 'fog',
    'пасмурно, небольшой дождь': 'overcast, light rain',
    'облачно, небольшой дождь': 'cloudy, light rain',
  }

  if (dictionary[normalized]) return dictionary[normalized]
  if (/[а-яё]/i.test(description)) return 'weather conditions'
  return description
}

function formatTempRange(values: number[]): string {
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return `${min > 0 ? '+' : ''}${min}°C`
  return `${min > 0 ? '+' : ''}${min}…${max > 0 ? '+' : ''}${max}°C`
}

function formatForecastLabel(label: string, description: string, values: number[]): string {
  const tempRange = formatTempRange(values)
  const pieces = [label]
  if (description) pieces.push(description.toLowerCase())
  if (tempRange) pieces.push(tempRange)
  return pieces.join(' — ')
}

function extractForecastSummary(html: string, period: WeatherPeriod, cityLocation: string, language: SearchLanguage): string {
  const dates = extractDateLabels(html)
  const descriptions = extractTooltipLabels(html)
  const temperatures = extractTemperatureValues(html)

  if (temperatures.length === 0) {
    throw new Error('Forecast data is missing')
  }

  const availableDayCount = dates.length > 0 ? dates.length : 1
  const requestedDays =
    period === 'weekend'
      ? 3
      : period === '3-days'
        ? 3
        : period === 'weekly'
          ? 7
          : period === 'month'
            ? 30
            : period === 'today'
              ? 1
              : 1
  const dayCount = Math.min(availableDayCount, requestedDays)
  const slotsPerDay = Math.max(1, Math.floor(temperatures.length / availableDayCount))
  const daySummaries: string[] = []

  for (let index = 0; index < dayCount; index += 1) {
    const tempSlice = temperatures.slice(index * slotsPerDay, (index + 1) * slotsPerDay)
    const descSlice = descriptions.slice(index * slotsPerDay, (index + 1) * slotsPerDay)
    const fallbackRuLabel = period === 'tomorrow' ? 'Завтра' : 'Прогноз'
    const label =
      language === 'en'
        ? period === 'today'
          ? 'Today'
          : period === 'tomorrow'
            ? 'Tomorrow'
            : `Day ${index + 1}`
        : (dates[index]?.label ?? fallbackRuLabel)
    const description = pickDominantDescription(descSlice)
    daySummaries.push(formatForecastLabel(label, translateWeatherDescription(description, language), tempSlice))
  }

  const periodTitle =
    language === 'en'
      ? period === '3-days'
        ? '3-day forecast'
        : period === 'weekend'
          ? 'Weekend forecast'
        : period === 'weekly'
          ? 'Weekly forecast'
          : period === 'month'
            ? 'Monthly forecast'
            : period === 'today'
              ? 'Forecast for today'
            : 'Forecast for tomorrow'
      : period === '3-days'
        ? 'Прогноз на 3 дня'
        : period === 'weekend'
          ? 'Прогноз на выходные'
        : period === 'weekly'
          ? 'Прогноз на неделю'
          : period === 'month'
            ? 'Прогноз на месяц'
            : period === 'today'
              ? 'Прогноз на сегодня'
            : 'Прогноз на завтра'

  return language === 'en'
    ? `${periodTitle} for ${cityLocation}: ${daySummaries.join('; ')}.`
    : `${periodTitle} ${cityLocation}: ${daySummaries.join('; ')}.`
}

function buildCurrentWeatherAnswer(
  cityLocation: string,
  summary: ReturnType<typeof extractCurrentWeatherSummary>,
  language: SearchLanguage
): string {
  const temperature = `${summary.temperatureAir > 0 ? '+' : ''}${summary.temperatureAir}°C`
  const feelsLike = `${summary.temperatureFeelsLike > 0 ? '+' : ''}${summary.temperatureFeelsLike}°C`
  const description = translateWeatherDescription(summary.description, language).toLowerCase()
  const parts =
    language === 'en'
      ? [
          `Right now ${cityLocation} it is ${description}.`,
          `Temperature is ${temperature}, feels like ${feelsLike}.`,
        ]
      : [
          `Сейчас ${cityLocation} ${description}.`,
          `Температура ${temperature}, по ощущениям ${feelsLike}.`,
        ]

  if (typeof summary.windSpeed === 'number') {
    parts.push(language === 'en' ? `Wind is ${summary.windSpeed} m/s.` : `Ветер ${summary.windSpeed} м/с.`)
  }
  if (typeof summary.humidity === 'number') {
    parts.push(language === 'en' ? `Humidity is ${summary.humidity}%.` : `Влажность ${summary.humidity}%.`)
  }
  if (typeof summary.pressure === 'number') {
    parts.push(language === 'en' ? `Pressure is ${summary.pressure} mmHg.` : `Давление ${summary.pressure} мм рт. ст.`)
  }

  return parts.join(' ')
}

async function resolveGismeteoCity(query: string): Promise<GismeteoCity> {
  const normalized = applyGismeteoLocationAliases(normalizeText(query))
  if (!normalized) {
    throw new Error('City query is empty')
  }

  const lookupUrl = `${GISMETEO_BASE_URL}/mq/city/q/?q=${encodeURIComponent(normalized)}&geo=ru`
  const result = await fetchJson<GismeteoCitySearchResponse>(lookupUrl)
  const cities = result.data ?? []
  const normalizedQueryKey = normalizeLetters(normalized)
  const pinned = GISMETEO_PINNED_CITY_BY_QUERY[normalizedQueryKey]
  if (pinned) {
    const pinnedCity = cities.find(
      (city) =>
        city.id === pinned.id &&
        city.district?.slug === pinned.districtSlug &&
        city.subdistrict?.slug === pinned.subdistrictSlug
    )
    if (pinnedCity) return pinnedCity
  }

  const queryVariants = buildQueryVariants(normalized)
  const ranked = cities
    .filter((city) => Boolean(city?.id) && Boolean(city.slug))
    .map((city) => ({
      city,
      match: scoreCityMatch(queryVariants, city),
      isRu: city.country?.code === 'RU',
    }))
    .sort((left, right) => {
      if (left.match.priority !== right.match.priority) return left.match.priority - right.match.priority
      if (left.match.score !== right.match.score) return left.match.score - right.match.score
      const leftParen = parentheticalQualifierPenalty(left.city)
      const rightParen = parentheticalQualifierPenalty(right.city)
      if (leftParen !== rightParen) return leftParen - rightParen
      const leftMsk = moscowHomonymPenalty(left.city)
      const rightMsk = moscowHomonymPenalty(right.city)
      if (leftMsk !== rightMsk) return leftMsk - rightMsk
      if (left.isRu !== right.isRu) return left.isRu ? -1 : 1
      return left.city.id - right.city.id
    })

  const chosen = ranked[0]?.city

  if (!chosen) {
    throw new Error('City not found on Gismeteo')
  }

  return chosen
}

function extractCityNames(city: GismeteoCity): { name: string; location: string; englishName: string } {
  const name = city.translations?.ru?.city?.name?.trim() || city.slug
  const location = city.translations?.ru?.city?.nameP?.trim() || name
  const englishName = city.slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
  return { name, location, englishName: englishName || city.slug }
}

export async function callGismeteoWeatherAnswer(params: {
  query: string
  language: SearchLanguage
  locationQueryOverride?: string
}): Promise<
  | { ok: true; content: string; sources: WebSearchSource[] }
  | { ok: false; status: number; errText: string }
> {
  try {
    const extracted = extractWeatherLocationQuery(params.query)
    const locationQuery = (params.locationQueryOverride ?? extracted)?.trim()
    if (!locationQuery) {
      return { ok: false, status: 400, errText: 'City query is empty' }
    }
    const city = await resolveGismeteoCity(locationQuery)
    const cityNames = extractCityNames(city)
    const cityForAnswer = params.language === 'en' ? cityNames.englishName : cityNames.location
    const context = detectWeatherQueryContext(params.query)
    const period = context.period
    const pageUrl = buildWeatherPageUrl(city, period)
    const html = await fetchHtml(pageUrl)

    const answer =
      period === 'now'
        ? buildCurrentWeatherAnswer(cityForAnswer, extractCurrentWeatherSummary(html), params.language)
        : context.timeSlot
          ? buildSlotWeatherAnswer(cityForAnswer, period, context.timeSlot, html, params.language)
          : extractForecastSummary(html, period, cityForAnswer, params.language)

    return {
      ok: true,
      content: formatOpenAiWebSearchAnswer({
        answer,
        sources: [{ title: `Gismeteo: ${cityNames.name}`, url: normalizeWebSearchSourceUrl(pageUrl) }],
        language: params.language,
      }),
      sources: [{ title: `Gismeteo: ${cityNames.name}`, url: normalizeWebSearchSourceUrl(pageUrl) }],
    }
  } catch (error) {
    const errText = error instanceof Error ? error.message : 'Gismeteo weather fetch failed'
    const status = /City query is empty/i.test(errText)
      ? 400
      : /City not found on Gismeteo/i.test(errText)
        ? 404
        : 502

    return {
      ok: false,
      status,
      errText,
    }
  }
}

