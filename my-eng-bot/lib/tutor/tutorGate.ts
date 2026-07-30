/**
 * Shared trap gate for tutor turns (first-hop and hop 2+).
 * Hard-stops run before explicit-intent bypass; legacy smalltalk / large_order / off_topic after.
 */

import { hasExplicitTutorIntent, normalizeTutorQuery } from '@/lib/tutor/tutorIntent'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

export type TutorGateReason =
  | 'smalltalk'
  | 'off_topic'
  | 'large_order'
  | 'insult_teach'
  | 'product_parent'

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

/** Legacy thematic off-topic (after intent bypass). */
const OFF_TOPIC_RE =
  /^(кто\s+президент|кто\s+такой\s+президент|какая\s+погода|что\s+такое\s+любовь|реши\s+уравнен)/i

/** Legacy large orders (after intent bypass). */
const LARGE_ORDER_RE =
  /^(напиши|сочини|сделай)\s+.{0,40}(эссе|сочинен|письмо\s+работодател|письмо\s+на\s+работу)|дай\s+\d{2,}\s+слов/i

/** Cyrillic-safe "word" rest — JS \\w is ASCII-only. */
const W = '[а-яёa-z0-9]*'

/**
 * Hard-stops before explicit-intent bypass.
 * Compound patterns only — not single-word stop lists.
 * Jailbreak markers intentionally omitted (LLM + product block handle mixed jailbreak+grammar).
 */
const HARD_INSULT_TEACH_RE = new RegExp(
  `(научи${W}.{0,40}(ругат|оскорб)|оскорблениям|ругаться\\s+на\\s+англий|культурно\\s+послать|(как\\s+сказать|как\\s+по-английски|how\\s+to\\s+say).{0,40}(fuck\\s*you|f\\*\\*\\*|послать\\s+человек|бляд))`,
  'i'
)

const HARD_PRODUCT_PARENT_RE = new RegExp(
  `(гарантир${W}.{0,40}(пят[её]рк|оценк|ielts|балл)|вернут${W}\\s+деньг|возврат\\s+денег|лицензи${W}\\s+на\\s+образоват|безопасно.{0,20}для\\s+реб[её]н|(дорого|duolingo).{0,40}(duolingo|бесплат|дорог))`,
  'i'
)

const HARD_HOMEWORK_DUMP_RE = new RegExp(
  `(сделай\\s+.{0,40}домашк|помоги\\s+с\\s+.{0,40}домашк|домашк${W}\\s+по\\s+англий|(скинь|дай)\\s+.{0,50}(огэ|егэ|ответы\\s+на|ключи\\s+к)|(перевод|перевед${W})\\s+.{0,25}учебник|(перв(ое|ым)|втор(ое|ым)|следующ${W})\\s+предложен${W}.{0,30}сочинен|помоги\\s+с\\s+.{0,40}сочинен|презентац${W}.{0,40}слайд|(напиши|сочини|сделай)\\s+.{0,40}(эссе|сочинен)|(напиши|написать)\\s+.{0,50}учител${W}.{0,40}бол)`,
  'i'
)

const HARD_ENTERTAINMENT_RE =
  /(анекдот|рецепт\s+борщ|рецепт\s+на\s+англий|давай\s+просто\s+поболта|поболтаем|расскажи\s+о\s+себе|сыграем\s+в\s+роль|ты\s+официант|а\s+теперь\s+анекдот)/i

const HARD_PERSONA_META_RE = new RegExp(
  `(ты\\s+когда.?нибудь\\s+уста|хочешь\\s+быть\\s+человеком|любим${W}\\s+ученик|врал\\s+ученик|робот\\s+или\\s+человек|докажи\\s+что\\s+ты\\s+не\\s+робот|ты\\s+мой\\s+друг)`,
  'i'
)

function matchHardStop(query: string): TutorGateMatch | null {
  if (HARD_INSULT_TEACH_RE.test(query)) {
    return { reason: 'insult_teach', messageRu: TUTOR_CHAT_COPY.gateInsultTeach }
  }
  if (HARD_PRODUCT_PARENT_RE.test(query)) {
    return { reason: 'product_parent', messageRu: TUTOR_CHAT_COPY.gateProductParent }
  }
  if (HARD_HOMEWORK_DUMP_RE.test(query)) {
    return { reason: 'large_order', messageRu: TUTOR_CHAT_COPY.gateHomeworkDump }
  }
  if (HARD_ENTERTAINMENT_RE.test(query)) {
    return { reason: 'off_topic', messageRu: TUTOR_CHAT_COPY.gateEntertainment }
  }
  if (HARD_PERSONA_META_RE.test(query)) {
    return { reason: 'off_topic', messageRu: TUTOR_CHAT_COPY.gatePersonaMeta }
  }
  return null
}

/**
 * Returns a stop message when the query is smalltalk / hard-stop / clear off-topic / huge homework order.
 * Explicit EN learning intents bypass thematic stops — but not hard-stops.
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

  const hard = matchHardStop(query)
  if (hard) return hard

  if (hasExplicitTutorIntent(query)) return null

  if (LARGE_ORDER_RE.test(query)) {
    return { reason: 'large_order', messageRu: TUTOR_CHAT_COPY.gateHomeworkDump }
  }

  if (OFF_TOPIC_RE.test(query)) {
    return { reason: 'off_topic', messageRu: TUTOR_CHAT_COPY.outOfScopeFallback }
  }

  return null
}
