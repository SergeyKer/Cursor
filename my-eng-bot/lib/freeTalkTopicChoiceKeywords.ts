import { detectFreeTalkTopicChange } from './freeTalkTopicChange'
import { normalizeRuTopicKeyword, normalizeTopicToken, RU_TOPIC_KEYWORD_TO_EN } from './ruTopicKeywordMap'

/** EN: служебные токены и «пустые» слова — не тема (объединение с freeTalkContextNextQuestion + вводные). */
const TOPIC_CHOICE_SKIP_WORDS_EN = new Set([
  'the', 'and', 'but', 'for', 'with', 'about', 'from', 'into', 'that', 'this',
  'what', 'when', 'where', 'which', 'who', 'how', 'why', 'you', 'your', 'our',
  'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'will', 'would',
  'could', 'should', 'just', 'like', 'want', 'talk', 'discuss', 'some', 'any', 'all', 'time',
  'many', 'few', 'more', 'most', 'lot', 'lots', 'much',
  'free', 'thing', 'things', 'day', 'days', 'way', 'ways',
  'today', 'now', 'here', 'there', 'very', 'really', 'also', 'then', 'well',
  'yes', 'yep', 'yeah', 'ok', 'okay', 'sure', 'no', 'nope', 'nah',
  'lets',
  "let's",
  'let',
  'gonna',
  'wanna',
])

const TOPIC_CHOICE_SKIP_WORDS_RU = new Set([
  'и', 'а', 'но', 'или', 'про', 'о', 'об', 'в', 'на', 'с', 'по', 'для', 'это', 'эта',
  'этот', 'эти', 'что', 'где', 'когда', 'как', 'почему', 'кто', 'мне', 'меня', 'мой',
  'моя', 'мои', 'тема', 'хочу', 'хотел', 'хотела', 'говорить', 'поговорить', 'время',
  'да', 'нет', 'ага', 'угу',
])

const NON_TOPIC_RU_TOKENS = new Set([
  'делать', 'делаю', 'делал', 'делала', 'делаем', 'делали',
  'пробовать', 'пробую', 'пробовал', 'пробовала', 'пробовали',
  'нравиться', 'нравится', 'нравились', 'нравилось',
  'играть', 'играю', 'играл', 'играла', 'играли',
  'плавать', 'плаваю', 'плавал', 'плавала', 'плавали',
  'ходить', 'хожу', 'ходил', 'ходила', 'ходили',
  'говорить', 'говорю', 'говорил', 'говорила', 'говорили',
  'думать', 'думаю', 'думал', 'думала', 'думали',
  'учить', 'учу', 'учил', 'учила', 'учили',
  'использовать', 'использую', 'использовал', 'использовала', 'использовали',
  'быть', 'есть', 'был', 'была', 'были',
])

const NON_TOPIC_VERB_TOKENS = new Set([
  'try', 'tried', 'tries', 'trying',
  'enjoy', 'enjoyed', 'enjoys', 'enjoying',
  'play', 'played', 'plays', 'playing',
  'swim', 'swam', 'swum', 'swims', 'swimming',
  'do', 'does', 'did', 'doing', 'done',
  'go', 'goes', 'went', 'going', 'gone',
  'visit', 'visited', 'visiting', 'visits',
  'watch', 'watched', 'watches', 'watching',
  'talked', 'talks', 'talking',
  'think', 'thinking', 'thought',
  'learn', 'learned', 'learning', 'learns',
  'use', 'used', 'uses', 'using',
  'focus', 'focused', 'focusing',
])

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Снимает вводные без смены detectFreeTalkTopicChange (например «tell me about», «расскажи о»).
 */
function stripLeadingTopicChoiceIntroPhrases(text: string): string {
  let t = normalizeSpaces(text)
  let prev = ''
  const patterns: RegExp[] = [
    /^(?:could you|can you|please)\s+tell\s+me\s+about\s+/i,
    /^(?:tell me|tell us)(?:\s+more)?\s+about\s+/i,
    /^(?:расскажи|расскажите)(?:\s+мне)?\s+(?:про|о|об)\s+/i,
  ]
  while (t !== prev) {
    prev = t
    for (const re of patterns) {
      const next = t.replace(re, '').trim()
      if (next !== t) t = next
    }
  }
  return t
}

export function isLikelyNonTopicToken(token: string): boolean {
  const n = normalizeTopicToken(token)
  if (!n || n.length < 3) return true
  if (TOPIC_CHOICE_SKIP_WORDS_EN.has(n) || TOPIC_CHOICE_SKIP_WORDS_RU.has(n)) return true
  return NON_TOPIC_VERB_TOKENS.has(n) || NON_TOPIC_RU_TOKENS.has(n)
}

export function extractTopicChoiceKeywordsByLang(userText: string): { en: string[]; ru: string[] } {
  const rawEn = userText.match(/\b[a-z][a-z']+\b/gi) ?? []
  const rawRu = userText.match(/[а-яё]+(?:-[а-яё]+)*/gi) ?? []
  const en: string[] = []
  const ru: string[] = []

  for (const tok of rawEn) {
    const n = normalizeTopicToken(tok)
    if (!n || n.length < 3) continue
    if (isLikelyNonTopicToken(n)) continue
    if (!en.includes(n)) en.push(n)
    if (en.length >= 8) break
  }
  for (const tok of rawRu) {
    const n = normalizeTopicToken(tok)
    if (!n || n.length < 3) continue
    if (TOPIC_CHOICE_SKIP_WORDS_RU.has(n) || NON_TOPIC_RU_TOKENS.has(n)) continue
    if (!ru.includes(n)) ru.push(n)
    if (ru.length >= 8) break
  }

  return { en, ru }
}

export function translateRuTopicKeywordsToEn(keywords: string[]): string[] {
  const translated: string[] = []
  for (const keyword of keywords) {
    const normalized = normalizeRuTopicKeyword(keyword)
    if (!normalized) continue
    if (NON_TOPIC_RU_TOKENS.has(normalized)) continue
    const mapped = RU_TOPIC_KEYWORD_TO_EN[normalized]
    if (!mapped) continue
    if (isLikelyNonTopicToken(mapped)) continue
    if (!translated.includes(mapped)) translated.push(mapped)
    if (translated.length >= 8) break
  }
  return translated
}

/**
 * Ключевые слова для якорного вопроса free_talk (первый ответ пользователя и те же правила там,
 * где раньше вызывали extractTopicChoiceKeywordsByLang + RU→EN).
 * Явный хвост из detectFreeTalkTopicChange имеет приоритет; иначе — снятие вводных + токенизация.
 */
export function buildFreeTalkTopicChoiceKeywordList(userText: string): string[] {
  const buckets = buildFreeTalkTopicChoiceKeywordBuckets(userText)
  return buckets.en.length > 0 ? buckets.en : buckets.ruToEn
}

export function buildFreeTalkTopicChoiceKeywordBuckets(userText: string): { en: string[]; ruToEn: string[] } {
  const raw = normalizeSpaces(userText)
  if (!raw) return { en: [], ruToEn: [] }

  const det = detectFreeTalkTopicChange(raw)
  let source = raw
  if (det.isTopicChange && det.topicHintText?.trim()) {
    source = det.topicHintText.trim()
  } else if (!det.isTopicChange) {
    source = stripLeadingTopicChoiceIntroPhrases(raw)
  }

  const { en, ru } = extractTopicChoiceKeywordsByLang(source)
  return { en, ruToEn: translateRuTopicKeywordsToEn(ru) }
}
