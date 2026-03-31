import type { ChatMessage } from './types'
import { buildFreeTalkTopicAnchorQuestion } from './freeTalkQuestionAnchor'
import { RU_TOPIC_KEYWORD_TO_EN, normalizeRuTopicKeyword, normalizeTopicToken } from './ruTopicKeywordMap'

/** Служебные слова — не считаем темой диалога. */
const SKIP_EN = new Set([
  'the', 'and', 'but', 'for', 'with', 'about', 'from', 'into', 'that', 'this',
  'what', 'when', 'where', 'which', 'who', 'how', 'why', 'you', 'your', 'our',
  'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'will', 'would',
  'could', 'should', 'just', 'like', 'want', 'talk', 'some', 'any', 'all', 'time',
  'many', 'few', 'more', 'most', 'lot', 'lots', 'much',
  'free', 'thing', 'things', 'day', 'days', 'way', 'ways', 'life', 'work', 'home',
  'today', 'now', 'here', 'there', 'very', 'much', 'really', 'also', 'then', 'well',
  'yes', 'yep', 'yeah', 'ok', 'okay', 'sure', 'no', 'nope', 'nah',
])
const SKIP_RU = new Set([
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
  'talk', 'talked', 'talks', 'talking',
  'think', 'thinking', 'thought',
  'learn', 'learned', 'learning', 'learns',
  'use', 'used', 'uses', 'using',
  'focus', 'focused', 'focusing',
])

function isLikelyNonTopicToken(token: string): boolean {
  const t = normalizeTopicToken(token)
  if (!t) return true
  if (SKIP_EN.has(t) || SKIP_RU.has(t)) return true
  return NON_TOPIC_VERB_TOKENS.has(t) || NON_TOPIC_RU_TOKENS.has(t)
}

const NARROW_TOPIC_PARENT_MAP: Record<string, string> = {
  shovel: 'tools',
  hammer: 'tools',
  screwdriver: 'tools',
  wrench: 'tools',
  violin: 'music',
  guitar: 'music',
  piano: 'music',
  forest: 'nature',
  tree: 'nature',
  river: 'nature',
  lake: 'nature',
  cat: 'pets',
  dog: 'pets',
  bike: 'transport',
  bicycle: 'transport',
  car: 'transport',
}

const BROAD_TOPICS = new Set([
  'nature',
  'travel',
  'music',
  'sports',
  'technology',
  'food',
  'culture',
  'transport',
  'pets',
  'work',
  'study',
  'hobbies',
])

function stripLeadingAiPrefix(line: string): string {
  return line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
}

function extractLastDialogueQuestionLine(content: string): string | null {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((l) => stripLeadingAiPrefix(l).trim())
    .filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i] ?? ''
    if (/\?\s*$/.test(line) && /[A-Za-z]/.test(line)) return line
  }
  return null
}

function extractRecentAssistantQuestions(messages: ChatMessage[], limit: number): string[] {
  const questions: string[] = []
  for (let i = messages.length - 1; i >= 0 && questions.length < limit; i--) {
    const msg = messages[i]
    if (msg?.role !== 'assistant') continue
    const q = extractLastDialogueQuestionLine(msg.content ?? '')
    if (q) questions.push(q)
  }
  return questions
}

function extractTopicChoiceKeywordsByLang(userText: string): { en: string[]; ru: string[] } {
  const rawEn = userText.match(/\b[a-z][a-z']+\b/gi) ?? []
  const rawRu = userText.match(/[а-яё]+(?:-[а-яё]+)*/gi) ?? []
  const en: string[] = []
  const ru: string[] = []

  for (const t of rawEn) {
    const n = normalizeTopicToken(t)
    if (!n || n.length < 3) continue
    if (isLikelyNonTopicToken(n)) continue
    if (!en.includes(n)) en.push(n)
    if (en.length >= 8) break
  }
  for (const t of rawRu) {
    const n = normalizeTopicToken(t)
    if (!n || n.length < 3) continue
    if (SKIP_RU.has(n)) continue
    if (!ru.includes(n)) ru.push(n)
    if (ru.length >= 8) break
  }

  return { en, ru }
}

function translateRuTopicKeywordsToEn(keywords: string[]): string[] {
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

function inferTopicBreadth(keyword: string): 'narrow' | 'broad' {
  if (BROAD_TOPICS.has(keyword)) return 'broad'
  if (NARROW_TOPIC_PARENT_MAP[keyword]) return 'narrow'
  return keyword.length >= 8 ? 'narrow' : 'broad'
}

function countRecentQuestionMentions(questions: string[], keyword: string): number {
  const re = new RegExp(`\\b${keyword}\\b`, 'i')
  return questions.reduce((acc, q) => (re.test(q) ? acc + 1 : acc), 0)
}

function scoreKeywordsFromAssistantQuestions(questions: string[], scored: Map<string, number>): void {
  const add = (w: string, points: number) => {
    const k = normalizeTopicToken(w)
    if (!k || k.length < 3 || isLikelyNonTopicToken(k)) return
    scored.set(k, (scored.get(k) ?? 0) + points)
  }

  for (const q of questions) {
    const lower = q.toLowerCase()
    for (const m of Array.from(lower.matchAll(/\babout (?:your|the|a|an|my)\s+([a-z][a-z'-]{2,})\b/g))) {
      add(m[1]!, 12)
    }
    for (const m of Array.from(
      lower.matchAll(/\b(?:your|the|a|an)\s+([a-z][a-z'-]{3,})\s+(?:is|was|are|looks|sounds)\b/g)
    )) {
      add(m[1]!, 6)
    }
    for (const m of Array.from(
      lower.matchAll(
        /\b(?:drive|driving|own|owned|love|like|prefer)\s+(?:your|the|a|an)?\s*([a-z][a-z'-]{2,})\b/g
      )
    )) {
      add(m[1]!, 8)
    }
  }
}

/**
 * Следующий вопрос для free_talk по недавней истории (вопросы ассистента + ответы пользователя).
 * Возвращает null, если тему выделить нельзя — тогда вызывающий код подставляет defaultNextQuestion.
 */
export function buildNextFreeTalkQuestionFromContext(params: {
  recentMessages: ChatMessage[]
  tense: string
  audience: 'child' | 'adult'
  diversityKey?: string
}): string | null {
  const { recentMessages, tense, audience, diversityKey = '' } = params
  if (!recentMessages.length) return null

  const recentQuestions = extractRecentAssistantQuestions(recentMessages, 4)
  const scored = new Map<string, number>()
  scoreKeywordsFromAssistantQuestions(recentQuestions, scored)

  const userSlice = recentMessages.filter((m) => m.role === 'user').slice(-10)
  const combinedUserLower = userSlice
    .map((m) => (m.content ?? '').toLowerCase())
    .join(' ')

  for (const um of userSlice) {
    const { en, ru } = extractTopicChoiceKeywordsByLang(um.content ?? '')
    for (const w of en) {
      const k = normalizeTopicToken(w)
      if (!k || isLikelyNonTopicToken(k)) continue
      scored.set(k, (scored.get(k) ?? 0) + 4)
    }
    for (const w of translateRuTopicKeywordsToEn(ru)) {
      const k = normalizeTopicToken(w)
      if (!k || isLikelyNonTopicToken(k)) continue
      scored.set(k, (scored.get(k) ?? 0) + 3)
    }
  }

  const qBlob = recentQuestions.join(' ').toLowerCase()
  for (const [k, v] of Array.from(scored.entries())) {
    if (qBlob.includes(k) && combinedUserLower.includes(k)) {
      scored.set(k, v + 10)
    }
  }

  const sorted = Array.from(scored.entries())
    .filter(([, s]) => s >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)

  const keywords = sorted.slice(0, 4)
  if (!keywords.length) return null

  const primary = keywords[0]!
  const breadth = inferTopicBreadth(primary)
  const askedOnPrimary = countRecentQuestionMentions(recentQuestions, primary)
  if (breadth === 'narrow' && askedOnPrimary >= 3) {
    const parent = NARROW_TOPIC_PARENT_MAP[primary]
    if (parent) {
      const expanded = [parent, ...keywords.filter((k) => k !== primary)].slice(0, 4)
      return buildFreeTalkTopicAnchorQuestion({
        keywords: expanded,
        tense,
        audience,
        diversityKey,
        recentAssistantQuestions: recentQuestions,
      })
    }
  }

  return buildFreeTalkTopicAnchorQuestion({
    keywords,
    tense,
    audience,
    diversityKey,
    recentAssistantQuestions: recentQuestions,
  })
}
