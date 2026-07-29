/**
 * Shared trap gate for tutor turns (first-hop and hop 2+).
 * Exact smalltalk + compound off-topic/large-order patterns only.
 */

import { hasExplicitTutorIntent, normalizeTutorQuery } from '@/lib/tutor/tutorIntent'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

export type TutorGateReason = 'smalltalk' | 'off_topic' | 'large_order'

export type TutorGateMatch = {
  reason: TutorGateReason
  messageRu: string
}

const SMALLTALK_EXACT = new Set(
  [
    'спасибо',
    'благодарю',
    'thanks',
    'thank you',
    'привет',
    'здравствуй',
    'здравствуйте',
    'пока',
    'до свидания',
    'ок',
    'окей',
    'ok',
    'okay',
    'понял',
    'поняла',
    'ясно',
    '👍',
    'ты бот',
    'ты бот?',
    'ты кто',
    'ты кто?',
    'как дела',
    'как дела?',
    'как тебя зовут',
    'как тебя зовут?',
  ].map((s) => s.toLowerCase())
)

const OFF_TOPIC_RE =
  /^(кто\s+президент|кто\s+такой\s+президент|какая\s+погода|что\s+такое\s+любовь|реши\s+уравнен)/i

const LARGE_ORDER_RE =
  /^(напиши|сочини|сделай)\s+.{0,40}(эссе|сочинен|письмо\s+работодател|письмо\s+на\s+работу)|дай\s+\d{2,}\s+слов/i

/**
 * Returns a stop message when the query is smalltalk / clear off-topic / huge homework order.
 * Explicit EN learning intents bypass thematic stop words.
 */
export function matchTutorGate(rawQuery: string): TutorGateMatch | null {
  const query = normalizeTutorQuery(rawQuery)
  if (!query) {
    return { reason: 'smalltalk', messageRu: TUTOR_CHAT_COPY.clarifyDefault }
  }

  const lower = query.toLowerCase().replace(/[.!]+$/g, '').trim()
  if (SMALLTALK_EXACT.has(lower)) {
    return { reason: 'smalltalk', messageRu: TUTOR_CHAT_COPY.gateSoftNext }
  }

  if (hasExplicitTutorIntent(query)) return null

  if (LARGE_ORDER_RE.test(query)) {
    return { reason: 'large_order', messageRu: TUTOR_CHAT_COPY.outOfScopeFallback }
  }

  if (OFF_TOPIC_RE.test(query)) {
    return { reason: 'off_topic', messageRu: TUTOR_CHAT_COPY.outOfScopeFallback }
  }

  return null
}
