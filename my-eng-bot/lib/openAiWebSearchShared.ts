type SearchLanguage = 'ru' | 'en'

export type WebSearchSource = {
  title?: string
  url: string
}

const EXPLICIT_WEB_SEARCH_PATTERNS = [
  /посмотри\s+в\s+интернете/i,
  /найди\s+в\s+интернете/i,
  /проверь\s+в\s+интернете/i,
  /посмотри.*в\s+интернете/i,
  /найди.*в\s+интернете/i,
  /проверь.*в\s+интернете/i,
  /\blook\s+it\s+up\b/i,
  /\bsearch\s+online\b/i,
  /\bfind\s+it\s+online\b/i,
  /\bcheck\s+online\b/i,
  /\blook\s+online\b/i,
]

const CURRENT_INFO_PATTERNS = [
  /сейчас/i,
  /сегодня/i,
  /на\s+сегодня/i,
  /на\s+сейчас/i,
  /новост[ьяей]/i,
  /курс/i,
  /цен[а-яё]*/i,
  /стоимост[ьяеи]/i,
  /расписан[иия]/i,
  /документаци[яи]/i,
  /обновлен[ияе]/i,
  /ваканси[яй]/i,
  /температур[а-яё]*/i,
  /погод[а-яё]*/i,
  /\blatest\b/i,
  /\bcurrent\b/i,
  /\bright\s+now\b/i,
  /\btoday\b/i,
  /\bnow\b/i,
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
]

const SOURCE_REQUEST_PATTERNS = [
  /(?:покажи|показать|дай|дайте|пришли|пришлите|добавь|добавьте)\s+(?:мне\s+)?(?:источники?|ссылки?|link(?:s)?|source(?:s)?)/i,
  /(?:источники?|ссылки?|link(?:s)?|source(?:s)?)/i,
]

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

function isWebSearchRequest(text: string): boolean {
  return EXPLICIT_WEB_SEARCH_PATTERNS.some((pattern) => pattern.test(text))
}

function isCurrentInfoRequest(text: string): boolean {
  return CURRENT_INFO_PATTERNS.some((pattern) => pattern.test(text))
}

export function shouldUseOpenAiWebSearch(text: string): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return false
  return isWebSearchRequest(normalized) || isCurrentInfoRequest(normalized)
}

export function shouldRequestOpenAiWebSearchSources(text: string): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return false
  return SOURCE_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function normalizeWebSearchSourceUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  return trimmed.replace(/[?#].*$/, '')
}

export function formatOpenAiWebSearchAnswer(params: {
  answer: string
  sources: WebSearchSource[]
  language: SearchLanguage
}): string {
  void params.sources
  void params.language
  const trimmed = normalizeText(params.answer)
  return trimmed.startsWith('(i)') ? trimmed : `(i) ${trimmed}`
}
