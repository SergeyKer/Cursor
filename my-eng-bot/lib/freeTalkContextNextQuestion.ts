import type { ChatMessage } from './types'
import { buildFreeTalkTopicAnchorQuestion } from './freeTalkQuestionAnchor'
import { buildFreeTalkTopicChoiceKeywordBuckets, isLikelyNonTopicToken } from './freeTalkTopicChoiceKeywords'
import { normalizeTopicToken } from './ruTopicKeywordMap'

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
    const { en, ruToEn } = buildFreeTalkTopicChoiceKeywordBuckets(um.content ?? '')
    for (const w of en) {
      const k = normalizeTopicToken(w)
      if (!k || isLikelyNonTopicToken(k)) continue
      scored.set(k, (scored.get(k) ?? 0) + 4)
    }
    for (const w of ruToEn) {
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
