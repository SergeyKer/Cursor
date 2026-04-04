type SearchLanguage = 'ru' | 'en'

export type WebSearchSource = {
  title?: string
  url: string
  publishedAt?: string
  isStale?: boolean
}

const EXPLICIT_WEB_SEARCH_PATTERNS = [
  /посмотри\s+в\s+интернет[е]?/i,
  /смотри\s+в\s+интернет[е]?/i,
  /найди\s+в\s+интернет[е]?/i,
  /проверь\s+в\s+интернет[е]?/i,
  /посмотри.*в\s+интернет[е]?/i,
  /смотри.*в\s+интернет[е]?/i,
  /найди.*в\s+интернет[е]?/i,
  /проверь.*в\s+интернет[е]?/i,
  /поищи\s+в\s+интернет[е]?/i,
  /поищи.*в\s+интернет[е]?/i,
  /\blook\s+it\s+up\b/i,
  /\bsearch\s+online\b/i,
  /\bfind\s+it\s+online\b/i,
  /\bcheck\s+online\b/i,
  /\blook\s+online\b/i,
  // Natural phrasing + common typo "inretnet" (treat as "internet")
  /\b(?:look|search|find|check)(?:ing)?\s+(?:in|on)\s+(?:the\s+)?(?:web|internet|inretnet)\b/i,
  /\bsearch\s+(?:in\s+)?(?:the\s+)?(?:web|internet|inretnet)\b/i,
  /\b(?:google|web)\s+search\b/i,
]

const WEB_SEARCH_FORCE_CODES = ['иии', 'iii']

const CURRENT_INFO_PATTERNS = [
  /сейчас/i,
  /сегодня/i,
  /на\s+сегодня/i,
  /на\s+сейчас/i,
  /последн(?:яя|ие)\s+недел/i,
  /предпоследн(?:яя|ие)\s+недел/i,
  /за\s+последн(?:юю|ие)\s+недел/i,
  /за\s+недел/i,
  /эт(?:от|ом)\s+месяц/i,
  /за\s+месяц/i,
  /за\s+последн(?:ие|юю)\s+дн/i,
  /пару\s+дн(?:ей|я)\s+назад/i,
  /на\s+текущ(?:ий|ий\s+момент|ий\s+день|ее\s+время|ий\s+час)/i,
  /актуальн(?:ая|ые|ую|ой|ое|о)/i,
  /свеж(?:ая|ие|ую|ий|ие\s+данные|ая\s+инфа|ие\s+новости)/i,
  /что\s+нового/i,
  /(?:текущ(?:его|ий|ая|ее)|нынешн(?:его|ий|ая|ее)|действующ(?:его|ий|ая|ее|ей|ую|им|ым|ом|ему|ему))\s+(?:чемпионат|сезон|соревнован[а-яё]*)/i,
  /какие\s+даты\s+(?:текущ(?:его|ий|ая|ее)|нынешн(?:его|ий|ая|ее)|действующ(?:его|ий|ая|ее|ей|ую|им|ым|ом|ему|ему))\s+(?:чемпионат|сезон|соревнован[а-яё]*)/i,
  /кто\s+.*последн(?:ий|яя|ее).*?(тренер|мэр|президент|министр|губернатор|чемпионка|чемпион(?!ат)|победительница|победители|победитель|обладатель|обладательница|лауреат|лауреатка)/i,
  /последн(?:ий|яя|ее)\s+(тренер|мэр|президент|министр|губернатор|чемпионка|чемпион(?!ат)|победительница|победители|победитель|обладатель|обладательница|лауреат|лауреатка)/i,
  /кто\s+.*(текущ(?:ий|ая|ее)|нынешн(?:ий|яя|ее)).*?(тренер|мэр|президент|министр|губернатор|чемпионка|чемпион(?!ат)|победительница|победители|победитель|обладатель|обладательница|лауреат|лауреатка)/i,
  /когда\s+(?:будет|будут|состоится|состоятся|пройдет|пройдут|начн(?:ется|утся))\s+.*(матч|мероприят|концерт|турнир|паводк|наводнен|сезон|запуск|релиз|выпуск|открыти|закрыти|выборы|форум|конференц|чемпионат|олимпиад|премьер)/i,
  /последн(?:яя|яя\s+новая|ая)\s+модел[ьи](?:\s|$|[?.!,;:])/i,
  /нов(?:ая|ейшая)\s+модел[ьи](?:\s|$|[?.!,;:])/i,
  /(?:когда\s+)?(?:следующ|будущ|ближайш|предстоящ)[а-я]*\s+(?:матч|игр|турнир|концерт|релиз|запуск|выбор|сезон|этап|форум|конференц|премьер)/i,
  /(?:кто\s+)?(?:следующ|будущ|ближайш|предстоящ)[а-я]*\s+(?:тренер|коуч|наставник)/i,
  /какие\s+планы/i,
  /что\s+запланировано/i,
  /прогноз/i,
  /паводк/i,
  /наводнен/i,
  /новост[ьяей]/i,
  /курс/i,
  /цен[а-яё]*/i,
  /стоимост[ьяеи]/i,
  /расписан[иия]/i,
  /документаци[яи]/i,
  /обновлен[ияе]/i,
  /ваканси[яй]/i,
  /рейтинг/i,
  /температур[а-яё]*/i,
  /погод[а-яё]*/i,
  /\blatest\b/i,
  /\bcurrent\b/i,
  /\bright\s+now\b/i,
  /\btoday\b/i,
  /\bnow\b/i,
  /\blast\s+week\b/i,
  /\bpast\s+week\b/i,
  /\bthis\s+month\b/i,
  /\bin\s+recent\s+days\b/i,
  /\ba\s+couple\s+of\s+days\s+ago\b/i,
  /\bup[\s-]?to[\s-]?date\b/i,
  /\brecent\b/i,
  /\bwhat'?s\s+new\b/i,
  /\bwho\s+is\s+the\s+(?:latest|current|last|reigning)\s+(?:coach|manager|mayor|president|minister|governor|champion(?!ship)|winners?)\b/i,
  /\bwhen\s+(?:will|does)\s+.*\b(start|begin)\b/i,
  /\bwhen\s+is\s+.*\b(scheduled|planned|expected)\b/i,
  /\b(?:next|upcoming)\s+(?:match|game|tournament|concert|release|launch|election|season|stage|forum|conference|premiere)\b/i,
  /\b(?:next|upcoming)\s+(?:coach|manager|head\s+coach)\b/i,
  /\bwhat\s+are\s+the\s+plans\b/i,
  /\bwhat\s+is\s+planned\b/i,
  /\bforecast\b/i,
  /\bflood(?:s|ing)?\b/i,
  /\bseason\s+(?:start|starts|begin|begins)\b/i,
  /\bstart\s+date\b/i,
  /\bnews\b/i,
  /\bprice(?:s)?\b/i,
  /\bcost\b/i,
  /\bschedule\b/i,
  /\bdocs?\b/i,
  /\bdocumentation\b/i,
  /\bweather\b/i,
  /\btemperature\b/i,
  /\bexchange\s+rate\b/i,
  /\bjob\s+openings?\b/i,
  /\branking\b/i,
  /\brank(?:ed|ing)?\b/i,
  /\bposition\s+in\s+(?:the\s+)?rankings?\b/i,
  // Местное время в городе — нужен веб-поиск, иначе модель может ошибиться.
  /сколько\s+времени\s+(?:во|в|на)\s+/i,
  /какое\s+время\s+(?:во|в|на)\s+/i,
  /который\s+час\s+(?:во|в|на)\s+/i,
  /какое\s+сейчас\s+время/i,
  /\bwhat\s+time\s+is\s+it\b/i,
  /\bwhat\s+time\s+in\s+/i,
  /\bcurrent\s+time\s+in\s+/i,
  // Цены, рейтинги, статистика по годам, события — без веб-поиска модель уходит в общие фразы.
  /сколько\s+сто(?:ит|ят)(?![а-яё])/i,
  /(?:^|\s)в\s+20\d{2}\s*году/i,
  /сам(?:ое|ый|ая|ые)\s+популярн/i,
  /статистик[а-яё]*/i,
  /(?:топ|рейтинг)\s+(?:\d+|имен|фильм|сериал)/i,
  /\bhow\s+much\s+(?:is|are|does|do)\b/i,
  /\bin\s+20\d{2}\b.*(?:popular|ranking|statistics|event|championship)/i,
  /\b(?:upcoming|scheduled)\s+(?:event|concert|match|game)\b/i,
]

const WEATHER_BASE_PATTERNS = [
  /погод[а-яё]*/i,
  /температур[а-яё]*/i,
  /прогноз(?:\s+погоды)?/i,
  /выходн(?:ые|ых|ым|ыми|ах|ам|ую)?/i,
  /weekend/i,
  /weather/i,
  /forecast/i,
]

const WEATHER_HORIZON_PATTERNS = [
  /завтра/i,
  /сегодня/i,
  /на\s+3\s*дн(?:я|ей)/i,
  /(?:3|три)\s*дн(?:я|ей)/i,
  /на\s+недел(?:ю|е)/i,
  /следующ(?:ая|ую|ей)\s+недел(?:я|ю|е)/i,
  /на\s+месяц/i,
  /(?:3\s*day(?:s)?|3-day)/i,
  /(?:weekly|monthly)/i,
  /tomorrow/i,
  /today/i,
  /next\s+week/i,
  /next\s+month/i,
]

const WEATHER_FOLLOWUP_PATTERNS = [
  /^(?:а|и|ну)?\s*(?:вечером|ночью|утром|дн[её]м|днем)(?:\s|$|[?.!,;:])/i,
  /^(?:а|и|ну)?\s*(?:(?:в|на)\s+)?выходн(?:ые|ых|ым|ыми|ах|ам|ую)?(?:\s|$|[?.!,;:])/i,
  /^(?:а|и|ну)?\s*(?:завтра|сегодня)(?:\s|$|[?.!,;:])/i,
  /^(?:а|и|ну)?\s*(?:на\s+)?недел(?:ю|е)(?:\s|$|[?.!,;:])/i,
  /^(?:а|и|ну)?\s*(?:на\s+)?месяц(?:\s|$|[?.!,;:])/i,
]

const RECENCY_SENSITIVE_PATTERNS = [
  /сейчас/i,
  /сегодня/i,
  /на\s+сегодня/i,
  /на\s+сейчас/i,
  /последн(?:яя|ие)\s+недел/i,
  /предпоследн(?:яя|ие)\s+недел/i,
  /за\s+последн(?:юю|ие)\s+недел/i,
  /эт(?:от|ом)\s+месяц/i,
  /за\s+последн(?:ие|юю)\s+дн/i,
  /пару\s+дн(?:ей|я)\s+назад/i,
  /на\s+текущ(?:ий|ий\s+момент|ий\s+день|ее\s+время|ий\s+час)/i,
  /актуальн(?:ая|ые|ую|ой|ое|о)/i,
  /свеж(?:ая|ие|ую|ий|ие\s+данные|ая\s+инфа|ие\s+новости)/i,
  /что\s+нового/i,
  /(?:текущ(?:его|ий|ая|ее)|нынешн(?:его|ий|ая|ее)|действующ(?:его|ий|ая|ее|ей|ую|им|ым|ом|ему|ему))\s+(?:чемпионат|сезон|соревнован[а-яё]*)/i,
  /какие\s+даты\s+(?:текущ(?:его|ий|ая|ее)|нынешн(?:его|ий|ая|ее)|действующ(?:его|ий|ая|ее|ей|ую|им|ым|ом|ему|ему))\s+(?:чемпионат|сезон|соревнован[а-яё]*)/i,
  /кто\s+.*последн(?:ий|яя|ее).*?(тренер|мэр|президент|министр|губернатор|чемпионка|чемпион(?!ат)|победительница|победители|победитель|обладатель|обладательница|лауреат|лауреатка)/i,
  /последн(?:ий|яя|ее)\s+(тренер|мэр|президент|министр|губернатор|чемпионка|чемпион(?!ат)|победительница|победители|победитель|обладатель|обладательница|лауреат|лауреатка)/i,
  /когда\s+(?:будет|будут|состоится|состоятся|пройдет|пройдут|начн(?:ется|утся))\s+.*(матч|мероприят|концерт|турнир|паводк|наводнен|сезон|запуск|релиз|выпуск|выборы|форум|конференц|чемпионат|олимпиад|премьер)/i,
  /последн(?:яя|яя\s+новая|ая)\s+модел[ьи](?:\s|$|[?.!,;:])/i,
  /нов(?:ая|ейшая)\s+модел[ьи](?:\s|$|[?.!,;:])/i,
  /(?:когда\s+)?(?:следующ|будущ|ближайш|предстоящ)[а-я]*\s+(?:матч|игр|турнир|концерт|релиз|запуск|выбор|сезон|этап|форум|конференц|премьер)/i,
  /(?:кто\s+)?(?:следующ|будущ|ближайш|предстоящ)[а-я]*\s+(?:тренер|коуч|наставник)/i,
  /какие\s+планы/i,
  /что\s+запланировано/i,
  /прогноз/i,
  /паводк/i,
  /наводнен/i,
  /рейтинг/i,
  /\blatest\b/i,
  /\bcurrent\b/i,
  /\bright\s+now\b/i,
  /\btoday\b/i,
  /\bnow\b/i,
  /\blast\s+week\b/i,
  /\bpast\s+week\b/i,
  /\bthis\s+month\b/i,
  /\bin\s+recent\s+days\b/i,
  /\ba\s+couple\s+of\s+days\s+ago\b/i,
  /\bup[\s-]?to[\s-]?date\b/i,
  /\brecent\b/i,
  /\bwhat'?s\s+new\b/i,
  /\bwho\s+is\s+the\s+(?:latest|current|last|reigning)\s+(?:coach|manager|mayor|president|minister|governor|champion(?!ship)|winners?)\b/i,
  /\bwhen\s+(?:will|does)\s+.*\b(start|begin)\b/i,
  /\bwhen\s+is\s+.*\b(scheduled|planned|expected)\b/i,
  /\b(?:next|upcoming)\s+(?:match|game|tournament|concert|release|launch|election|season|stage|forum|conference|premiere)\b/i,
  /\b(?:next|upcoming)\s+(?:coach|manager|head\s+coach)\b/i,
  /\bwhat\s+are\s+the\s+plans\b/i,
  /\bwhat\s+is\s+planned\b/i,
  /\bforecast\b/i,
  /\bflood(?:s|ing)?\b/i,
  /\branking\b/i,
  /\brank(?:ed|ing)?\b/i,
  /\bposition\s+in\s+(?:the\s+)?rankings?\b/i,
  /\bseason\s+(?:start|starts|begin|begins)\b/i,
  /\bstart\s+date\b/i,
  /сколько\s+времени\s+(?:во|в|на)\s+/i,
  /какое\s+время\s+(?:во|в|на)\s+/i,
  /который\s+час\s+(?:во|в|на)\s+/i,
  /какое\s+сейчас\s+время/i,
  /\bwhat\s+time\s+is\s+it\b/i,
  /\bwhat\s+time\s+in\s+/i,
  /\bcurrent\s+time\s+in\s+/i,
  /сколько\s+сто(?:ит|ят)(?![а-яё])/i,
  /(?:^|\s)в\s+20\d{2}\s*году/i,
  /сам(?:ое|ый|ая|ые)\s+популярн/i,
  /статистик[а-яё]*/i,
  /(?:топ|рейтинг)\s+(?:\d+|имен|фильм|сериал)/i,
  /\bhow\s+much\s+(?:is|are|does|do)\b/i,
  /\bin\s+20\d{2}\b.*(?:popular|ranking|statistics|event|championship)/i,
  /\b(?:upcoming|scheduled)\s+(?:event|concert|match|game)\b/i,
]

const SOURCE_REQUEST_PATTERNS = [
  /(?:покажи|показать|дай|дайте|пришли|пришлите|добавь|добавьте|show|give|send)\s+(?:мне\s+)?(?:источник(?:а|у|ом|е|и|ов|ам|ами|ах)?|ссылк(?:а|и|у|е|ой|ок|ам|ами|ах)?|link(?:s)?|source(?:s)?)/i,
  /(?:где|какие|какой|нужны|нужен|покажи)\s+.*(?:источник(?:а|у|ом|е|и|ов|ам|ами|ах)?|ссылк(?:а|и|у|е|ой|ок|ам|ами|ах)?|link(?:s)?|source(?:s)?)/i,
  /^(?:источник(?:а|у|ом|е|и|ов|ам|ами|ах)?|ссылк(?:а|и|у|е|ой|ок|ам|ами|ах)?|sources?|links?)\s*\??$/i,
]

const ALL_SOURCES_REQUEST_PATTERNS = [
  /(?:покажи|показать|дай|дайте|выведи|раскрой)\s+все\s+(?:источник(?:и|ов|ам|ами|ах)?|ссылк(?:и|ок|ам|ами|ах)?)/i,
  /^(?:покажи|показать)\s+все\s*$/i,
  /^(?:все\s+(?:источник(?:и|ов)?|ссылк(?:и|ок)?))\s*\??$/i,
  /^(?:all\s+sources|show\s+all(?:\s+sources)?|show\s+all\s+links?)$/i,
]

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function stripWebSearchForceCode(text: string): string {
  const normalized = normalizeText(text)
  if (!normalized) return normalized
  let out = normalized
  for (const code of WEB_SEARCH_FORCE_CODES) {
    const re = new RegExp(`^${escapeRegExp(code)}(?:[\\s,.:;!?-]+|$)`, 'i')
    out = out.replace(re, '').trim()
  }
  return out
}

export function hasWebSearchForceCode(text: string): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return false
  return WEB_SEARCH_FORCE_CODES.some((code) => {
    const re = new RegExp(`^${escapeRegExp(code)}(?:[\\s,.:;!?-]+|$)`, 'i')
    return re.test(normalized)
  })
}

function keepOnlyCelsius(text: string): string {
  let next = text
    // 45°F (7°C) -> 7°C
    .replace(
      /(-?\d+(?:[.,]\d+)?)\s*°?\s*F\s*\(\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*C\s*\)/gi,
      '$2°C'
    )
    // 7°C (45°F) -> 7°C
    .replace(
      /(-?\d+(?:[.,]\d+)?)\s*°?\s*C\s*\(\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*F\s*\)/gi,
      '$1°C'
    )
    // Удаляем одиночные значения в Фаренгейтах.
    .replace(/\(?\s*-?\d+(?:[.,]\d+)?\s*°?\s*F\s*\)?/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')

  return next.trim()
}

/** Сноски вида (example.com), (rostov.rbc.ru) без http — убираем из текста ответа. */
export function stripParentheticalDomainCitations(text: string): string {
  // Поддерживаем обычные домены и punycode-TLD, например "(xn--80aidamjr3akke.xn--p1ai)".
  return text.replace(/\(\s*(?:[a-z0-9-]+\.)+[a-z0-9-]{2,}(?:\/[^\s)]*)?\s*\)/gi, '')
}

function stripInlineSourceMentions(text: string): string {
  let next = text
    // [title](https://example.com) -> title
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1')
    // Убираем прямое упоминание ru.wikipedia.org из текста ответа.
    .replace(/\(?\s*ru\.wikipedia\.org\s*\)?/gi, '')
    // Удаляем голые URL.
    .replace(/https?:\/\/[^\s)]+/gi, '')
    // Удаляем обертки-цитаты вида ([source]) или (source) для доменов.
    .replace(/\(\s*\[[^\]]+\]\s*\)/g, '')
  next = stripParentheticalDomainCitations(next)
    // Чистим оставшиеся служебные скобки/пробелы.
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')

  return next.trim()
}

function isWebSearchRequest(text: string): boolean {
  return EXPLICIT_WEB_SEARCH_PATTERNS.some((pattern) => pattern.test(text))
}

function isCurrentInfoRequest(text: string): boolean {
  return CURRENT_INFO_PATTERNS.some((pattern) => pattern.test(text))
}

function parseSourceDateCandidate(value: string): Date | null {
  // 2025-03-30 / 2025/03/30 / 2025_03_30
  const ymd = value.match(/(20\d{2})[-/_\.](0?[1-9]|1[0-2])[-/_\.](0?[1-9]|[12]\d|3[01])/)
  if (ymd) {
    const year = Number(ymd[1])
    const month = Number(ymd[2])
    const day = Number(ymd[3])
    const parsed = new Date(Date.UTC(year, month - 1, day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  // 2025-03 / 2025/03
  const ym = value.match(/(20\d{2})[-/_\.](0?[1-9]|1[0-2])(?![-/_\.\d])/)
  if (ym) {
    const year = Number(ym[1])
    const month = Number(ym[2])
    const parsed = new Date(Date.UTC(year, month - 1, 1))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  // fallback: year only
  const yearOnly = value.match(/(?:^|[^\d])(20\d{2})(?:[^\d]|$)/)
  if (yearOnly) {
    const parsed = new Date(Date.UTC(Number(yearOnly[1]), 0, 1))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function detectSourcePublishedAt(source: WebSearchSource): string | undefined {
  const dateFromTitle = source.title ? parseSourceDateCandidate(source.title) : null
  if (dateFromTitle) return dateFromTitle.toISOString()
  const dateFromUrl = parseSourceDateCandidate(source.url)
  if (dateFromUrl) return dateFromUrl.toISOString()
  return undefined
}

/**
 * Одно слово/фраза про «тему погоды» без города и без запроса факта — разговорный триггер,
 * не повод для веб-поиска и индикатора «ищет в интернете» (см. также gismeteoWeather).
 */
function isBareWeatherTopicOnly(text: string): boolean {
  const n = normalizeText(text).toLowerCase()
  if (!n) return false
  if (
    /^(?:давай\s+)?(?:поговорим|обсудим|поболтаем)\s+(?:про|о)\s+(?:погод[а-яё]*|температур[а-яё]*|прогноз(?:\s+погоды)?)$/.test(
      n
    )
  ) {
    return true
  }
  if (
    /^(?:let'?s\s+)?(?:talk|discuss|chat)\s+(?:about)\s+(?:(?:the|a|an)\s+)?(?:weather|forecast|temperature)$/.test(
      n
    )
  ) {
    return true
  }
  const englishWithoutArticle = n.replace(/^(?:the|a|an)\s+/, '')
  if (/^(weather|forecast|temperature|wheather|whether)$/i.test(englishWithoutArticle)) return true
  if (/^погод[а-яё]{0,4}$/.test(n)) return true
  if (/^температур[а-яё]{0,4}$/.test(n)) return true
  if (/^прогноз(?:\s+погоды)?$/.test(n)) return true
  return false
}

export function shouldUseOpenAiWebSearch(text: string): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return false
  const stripped = stripWebSearchForceCode(normalized)
  if (isBareWeatherTopicOnly(stripped)) return false
  return hasWebSearchForceCode(normalized) || isWebSearchRequest(stripped) || isCurrentInfoRequest(stripped)
}

export function isWeatherForecastRequest(text: string): boolean {
  const normalized = stripWebSearchForceCode(normalizeText(text))
  if (!normalized) return false

  const hasWeatherBase = WEATHER_BASE_PATTERNS.some((pattern) => pattern.test(normalized))
  if (hasWeatherBase) return true

  const hasWeatherContext = /(погод[а-яё]*|температур[а-яё]*|weather|forecast)/i.test(normalized)
  return hasWeatherContext && WEATHER_HORIZON_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function isWeatherFollowupRequest(text: string): boolean {
  const normalized = stripWebSearchForceCode(normalizeText(text))
  if (!normalized) return false
  return WEATHER_FOLLOWUP_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function isRecencySensitiveRequest(text: string): boolean {
  const normalized = stripWebSearchForceCode(normalizeText(text))
  if (!normalized) return false
  return RECENCY_SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function shouldRequestOpenAiWebSearchSources(text: string): boolean {
  const normalized = stripWebSearchForceCode(normalizeText(text))
  if (!normalized) return false
  return SOURCE_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function shouldRequestAllOpenAiWebSearchSources(text: string): boolean {
  const normalized = stripWebSearchForceCode(normalizeText(text))
  if (!normalized) return false
  return ALL_SOURCES_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function normalizeWebSearchSourceUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  return trimmed.replace(/[?#].*$/, '')
}

export function filterFreshWebSearchSources(
  sources: WebSearchSource[],
  options?: { now?: Date; maxAgeDays?: number }
): { sources: WebSearchSource[]; hiddenCount: number } {
  const now = options?.now ?? new Date()
  const maxAgeDays = options?.maxAgeDays ?? 120
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000

  let hiddenCount = 0
  const filtered: WebSearchSource[] = []

  for (const source of sources) {
    const publishedAt = detectSourcePublishedAt(source)
    if (!publishedAt) {
      filtered.push(source)
      continue
    }

    const publishedDate = new Date(publishedAt)
    if (Number.isNaN(publishedDate.getTime())) {
      filtered.push(source)
      continue
    }

    const isStale = now.getTime() - publishedDate.getTime() > maxAgeMs
    if (isStale) {
      hiddenCount += 1
      continue
    }

    filtered.push({
      ...source,
      publishedAt,
      isStale: false,
    })
  }

  return { sources: filtered, hiddenCount }
}

/** Сколько «словных» фрагментов осталось после вырезания даты/времени (для отсечения сухой строки). */
function countNonDateWordsRu(text: string): number {
  const stripped = text
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ')
    .replace(/\d{4}\s*г\.?/gi, ' ')
    .replace(/\d{1,2}\s+[а-яё]{3,}\.?/gi, ' ')
    .replace(/\d+/g, ' ')
  return stripped
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^[а-яё]{1,3}\.?$/i.test(w))
    .length
}

function isBareRussianDatetimeLine(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > 140) return false
  const hasDateChunk = /\d{1,2}\s+[а-яё]{3,}\.?\s+\d{2,4}\s*г/i.test(t)
  const hasClock = /\d{1,2}:\d{2}(:\d{2})?/.test(t)
  if (!hasDateChunk && !hasClock) return false
  if (countNonDateWordsRu(t) >= 3) return false
  return true
}

function isBareEnglishDatetimeLine(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > 140) return false
  const hasClock = /\d{1,2}:\d{2}(:\d{2})?/.test(t)
  if (!hasClock) return false
  const hasMonth = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(t)
  const wordCount = t.split(/\s+/).length
  if (hasMonth && wordCount <= 8) return true
  return wordCount <= 5 && !/[.!?]\s+[A-Z]/.test(t)
}

/** Из запроса «сколько времени во владивостоке» → «Во Владивостоке». */
function extractRussianTimeLocationPhrase(query: string): string | null {
  const m = query.match(
    /(?:сколько\s+времени|какое\s+(?:сейчас\s+)?время|который\s+час)\s+(?:во|в|на)\s+(.+)$/i
  )
  if (!m) return null
  let rest = m[1].trim().replace(/[.?!…]+$/, '')
  if (!rest) return null
  const name = rest.charAt(0).toUpperCase() + rest.slice(1)
  // \b с кириллицей в JS ненадёжен; ищем предлог «во» после пробела или в начале строки.
  const useVo = /(?:^|\s)во\s+/i.test(query)
  return useVo ? `Во ${name}` : `В ${name}`
}

function extractEnglishTimeLocationPhrase(query: string): string | null {
  const m =
    query.match(/\bwhat\s+time\s+is\s+it\s+in\s+(.+)$/i) ||
    query.match(/\b(?:current\s+time|time)\s+in\s+(.+)$/i)
  if (!m) return null
  const place = m[1].trim().replace(/[.?!]+$/, '')
  if (!place) return null
  return `In ${place.charAt(0).toUpperCase() + place.slice(1)}`
}

/**
 * Если веб-поиск вернул одну строку даты/времени без живой фразы — оборачиваем в связный ответ.
 */
export function embellishBareFactsAnswer(params: {
  rawAnswer: string
  userQuery: string
  language: SearchLanguage
}): string {
  const raw = normalizeText(params.rawAnswer)
  const q = normalizeText(params.userQuery)
  if (!raw) return raw

  if (params.language === 'ru') {
    if (!isBareRussianDatetimeLine(raw)) return raw
    const place = extractRussianTimeLocationPhrase(q)
    if (place) {
      return `${place} сейчас ${raw}.`
    }
    return `Сейчас по данным поиска: ${raw}.`
  }

  if (params.language === 'en') {
    if (!isBareEnglishDatetimeLine(raw)) return raw
    const place = extractEnglishTimeLocationPhrase(q)
    if (place) {
      return `${place} it's now ${raw}.`
    }
    return `According to search: ${raw}.`
  }

  return raw
}

export function formatOpenAiWebSearchAnswer(params: {
  answer: string
  sources: WebSearchSource[]
  language: SearchLanguage
}): string {
  void params.sources
  void params.language
  const trimmed = stripInlineSourceMentions(keepOnlyCelsius(normalizeText(params.answer)))
  return trimmed.startsWith('(i)') ? trimmed : `(i) ${trimmed}`
}
