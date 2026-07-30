/**
 * Route a tutor user turn: gate → continue | switch | first.
 * Pure: no React, no fetch.
 */

import type { TutorExplainAnswer } from '@/lib/tutor/types'
import {
  hasExplicitTopicSwitch,
  hasExplicitTutorIntent,
  isTutorMetaTeach,
  isTutorNoise,
  normalizeTutorQuery,
} from '@/lib/tutor/tutorIntent'
import { matchTutorGate, type TutorGateMatch } from '@/lib/tutor/tutorGate'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

export type TutorTurnRoute =
  | { kind: 'stop'; gate: TutorGateMatch }
  | { kind: 'continue'; query: string }
  | { kind: 'switch'; query: string }
  | { kind: 'first'; query: string }

// No \b after Cyrillic question words (JS \b is ASCII-only).
const CONTINUE_A_RE =
  /^(а|и)\s+(в\s+|на\s+|при\s+|пример|если|как|что|чем|когда|почему|зачем|отриц|утвержд|вопросе|прошлом|будущем|ещё|еще)/i

/** Grammar deepeners required when CONTINUE_A matches without topic mention. */
const CONTINUE_A_GRAMMAR_TAIL_RE =
  /(отриц|утвержд|пример|вопрос|форм|времен|прошлом|будущем|continuous|perfect|simple|артикл|have|got|\bdo\b|does|will|в\s+отрицан|в\s+утвержд)/i

const CONTINUE_EXACT_RE =
  /^(почему\??|зачем\??|можно\s+пример\??|ещё\s+пример|еще\s+пример|как\s+это\s+запомнить\??|что\s+это\s+значит\??|попроще|ещё\s+раз|еще\s+раз|не\s+понял|подробнее|поясни)\s*$/i

const CONTINUE_CHECK_RE = /^(проверь|правильно\s+ли)(?::|\s|$)|^is\s+this\s+correct\b/i

const SWITCH_PHRASE_RE = /^(а\s+теперь|другая\s+тема|давай\s+про|сменим)\b/i

function explainCorpus(answer: TutorExplainAnswer): string {
  return [
    answer.title,
    answer.topicAnchor.title,
    answer.topicAnchor.canonicalKey,
    answer.rememberRu ?? '',
    ...answer.paragraphs,
    ...answer.examplesEn,
  ]
    .join(' ')
    .toLowerCase()
}

function mentionsCurrentTopic(query: string, answer: TutorExplainAnswer): boolean {
  const q = query.toLowerCase()
  const title = (answer.topicAnchor.title || answer.title || '').toLowerCase()
  if (title && title.length >= 3 && q.includes(title)) return true
  const key = (answer.topicAnchor.canonicalKey || '').toLowerCase().replace(/_/g, ' ')
  if (key && key.length >= 3 && q.includes(key)) return true
  const corpus = explainCorpus(answer)
  const tokens = title.split(/[^a-zа-яё0-9]+/i).filter((t) => t.length >= 4)
  for (const t of tokens) {
    if (q.includes(t) && corpus.includes(t)) return true
  }
  return false
}

function isContinueFollowUp(query: string, lastExplain: TutorExplainAnswer): boolean {
  if (SWITCH_PHRASE_RE.test(query)) return false
  if (CONTINUE_EXACT_RE.test(query)) return true
  if (CONTINUE_CHECK_RE.test(query)) return true
  if (CONTINUE_A_RE.test(query) && !hasExplicitTopicSwitch(query, explainCorpus(lastExplain))) {
    if (mentionsCurrentTopic(query, lastExplain) || CONTINUE_A_GRAMMAR_TAIL_RE.test(query)) {
      return true
    }
    return false
  }
  if (
    mentionsCurrentTopic(query, lastExplain) &&
    !hasExplicitTopicSwitch(query, explainCorpus(lastExplain))
  ) {
    return true
  }
  return false
}

/**
 * Decide stop / continue / switch / first for a tutor message.
 */
export function routeTutorTurn(params: {
  query: string
  lastExplain: TutorExplainAnswer | null
}): TutorTurnRoute {
  const query = normalizeTutorQuery(params.query)
  const gate = matchTutorGate(query)
  if (gate) return { kind: 'stop', gate }

  if (isTutorNoise(query)) {
    return {
      kind: 'stop',
      gate: { reason: 'smalltalk', messageRu: TUTOR_CHAT_COPY.clarifyDefault },
    }
  }

  if (!params.lastExplain) {
    return { kind: 'first', query }
  }

  // Explicit new intent / meta / quiz on another topic → switch
  if (isTutorMetaTeach(query) || hasExplicitTutorIntent(query)) {
    if (isContinueFollowUp(query, params.lastExplain) && CONTINUE_CHECK_RE.test(query)) {
      return { kind: 'continue', query }
    }
    if (hasExplicitTopicSwitch(query, explainCorpus(params.lastExplain)) || isTutorMetaTeach(query)) {
      return { kind: 'switch', query }
    }
    // how_to_say / translate about something else while a topic is live → switch
    if (hasExplicitTutorIntent(query) && !mentionsCurrentTopic(query, params.lastExplain)) {
      return { kind: 'switch', query }
    }
  }

  if (isContinueFollowUp(query, params.lastExplain)) {
    return { kind: 'continue', query }
  }

  if (hasExplicitTopicSwitch(query, explainCorpus(params.lastExplain))) {
    return { kind: 'switch', query }
  }

  // Default with live topic: new substantive ask = switch (effective first-hop)
  return { kind: 'switch', query }
}

/** Short free-text answer while B/C chips are pending. */
export function isPendingAngleReply(query: string): boolean {
  const q = normalizeTutorQuery(query)
  if (!q) return false
  if (hasExplicitTutorIntent(q) || isTutorMetaTeach(q)) return false
  if (q.split(/\s+/).length > 8) return false
  return /^(когда|как|зачем|почему|что|чем|пример|ошибк|форма|значит|строить|ставит|скажи|разниц|отлич|поясни|объясни|частые)/i.test(
    q
  )
}
