export type FreeTalkTopicChangeDetection = {
  isTopicChange: boolean
  topicHintText: string | null
  needsClarification: boolean
}

const GENERIC_SWITCH_PATTERNS: RegExp[] = [
  /^\s*(?:something\s+else|another\s+topic|change\s+topic)\s*[.!?]*\s*$/i,
  /^\s*(?:другая\s+тема|сменим\s+тему|давай\s+сменим\s+тему)\s*[.!?]*\s*$/i,
]

const EXPLICIT_SWITCH_PATTERNS: RegExp[] = [
  /^\s*(?:let['’]?s|lets)\s+(?:talk|discuss)(?:\s+about)?\s*(.+)?$/i,
  /^\s*i\s+want\s+to\s+talk\s+about\s+(.+)\s*$/i,
  /^\s*can\s+we\s+talk\s+about\s+(.+?)\s*\??\s*$/i,
  /^\s*(?:talk\s+about|discuss)\s+(.+)\s*$/i,
  /^\s*(?:давай|давайте)\s+(?:поговорим|поговорить|обсудим|обсудить)(?:\s+(?:о|об|про))?\s*(.+)?$/i,
  /^\s*(?:хочу|хотел(?:а)?)\s+(?:поговорить|поговорим|обсудить|обсудим)(?:\s+(?:о|об|про))?\s*(.+)?$/i,
  /^\s*(?:можем|можно)\s+(?:поговорить|обсудить)(?:\s+(?:о|об|про))?\s*(.+)?$/i,
]

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function cleanTopicTail(text: string): string {
  return normalizeSpaces(text.replace(/^[\s,:;.!?-]+|[\s,:;.!?-]+$/g, ''))
}

/**
 * Расширенные формулировки смены темы (RU / EN / смесь), с извлечением хвоста темы где возможно.
 * Должны совпадать с тем, что учитывает isFixedTopicSwitchRequest (через detect).
 */
function tryExtendedTopicSwitchPatterns(text: string): FreeTalkTopicChangeDetection | null {
  let m: RegExpExecArray | null

  // RU: давай(те) сменим/поменяем тему [на …]
  m = /^\s*(?:давай|давайте|можем|можно)\s+(?:сменим|сменить|поменяем|поменять)\s+тему(?:\s+на\s+(.+))?[\s.!?]*$/i.exec(
    text
  )
  if (m) {
    const tail = m[1] ? cleanTopicTail(m[1]) : ''
    if (tail) return { isTopicChange: true, topicHintText: tail, needsClarification: false }
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }

  // EN: can we / could we / please change [the] topic [to …]
  m =
    /^\s*(?:can\s+we|could\s+we|please)\s+(?:change|switch)\s+(?:the\s+)?topic(?:\s+to\s+(.+?))?\s*\??\s*$/i.exec(
      text
    )
  if (m) {
    const tail = m[1] ? cleanTopicTail(m[1]) : ''
    if (tail) return { isTopicChange: true, topicHintText: tail, needsClarification: false }
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }

  // EN: … change / switch [the] topic [to …] (lets change topic to sky)
  m = /\b(?:change|switch)\s+(?:the\s+)?topic\b(?:\s+to\s+(.+))?/i.exec(text)
  if (m) {
    const tail = m[1] ? cleanTopicTail(m[1]) : ''
    if (tail) return { isTopicChange: true, topicHintText: tail, needsClarification: false }
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }

  // RU: хочу про реку / хотел(а) о кошках
  m = /^\s*(?:хочу|хотел(?:а)?)\s+(?:про|о|об)\s+(.+)$/i.exec(text)
  if (m) {
    const tail = cleanTopicTail(m[1] ?? '')
    if (tail) return { isTopicChange: true, topicHintText: tail, needsClarification: false }
  }

  // RU: давай про …
  m = /^\s*(?:давай|давайте)\s+(?:лучше\s+)?про\s+(.+)$/i.exec(text)
  if (m) {
    const tail = cleanTopicTail(m[1] ?? '')
    if (tail) return { isTopicChange: true, topicHintText: tail, needsClarification: false }
  }

  // RU: переключимся [на …]
  m = /^\s*(?:переключимся|переключись)(?:\s+на\s+(.+))?[\s.!?]*$/i.exec(text)
  if (m) {
    const tail = m[1] ? cleanTopicTail(m[1]) : ''
    if (tail) return { isTopicChange: true, topicHintText: tail, needsClarification: false }
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }

  // EN: (I) want to talk about X — короче, если не попало в EXPLICIT
  m = /^\s*i\s+want\s+(?:to\s+)?(?:talk|discuss)(?:\s+about)?\s+(.+)$/i.exec(text)
  if (m) {
    const tail = cleanTopicTail(m[1] ?? '')
    if (tail) return { isTopicChange: true, topicHintText: tail, needsClarification: false }
  }

  return null
}

/** Короткие эмоциональные / отказ — без названия темы (как «скучно» → переспрос с 1/2/3). */
function tryGenericEmotionalTopicSwitch(text: string): FreeTalkTopicChangeDetection | null {
  const t = normalizeSpaces(text)
  if (!t) return null

  if (
    /^(?:наскучило|скучно|надоело|дальше)\s*[.!?]*$/i.test(t) ||
    /^давай\s+дальше\s*[.!?]*$/i.test(t) ||
    /^давай\s+другой\s*[.!?]*$/i.test(t) ||
    /^давай\s+(?:ещё|еще)\s*[.!?]*$/i.test(t) ||
    /^другой\s+вопрос\s*[.!?]*$/i.test(t) ||
    /^не\s+хочу\s+(?:про\s+это|об\s+этом)\s*[.!?]*$/i.test(t) ||
    /^хватит\s*(?:про\s+это|про\s+этот|об\s+этом)?\s*[.!?]*$/i.test(t)
  ) {
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }

  if (
    /^(?:i\s+)?(?:am\s+)?bored\s*[.!?]*$/i.test(t) ||
    /^next\s*[.!?]*$/i.test(t) ||
    /^let['’]?s\s+(?:move\s+on|keep\s+going|continue)\s*[.!?]*$/i.test(t) ||
    /^another\s+one\s*[.!?]*$/i.test(t) ||
    /^different\s+question\s*[.!?]*$/i.test(t) ||
    /^another\s+question\s*[.!?]*$/i.test(t)
  ) {
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }

  if (/^new\s+topic\s*[.!?]*$/i.test(t)) {
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }
  return null
}

export function detectFreeTalkTopicChange(userText: string): FreeTalkTopicChangeDetection {
  const text = normalizeSpaces(userText)
  if (!text) {
    return { isTopicChange: false, topicHintText: null, needsClarification: false }
  }

  if (GENERIC_SWITCH_PATTERNS.some((re) => re.test(text))) {
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }

  const emotional = tryGenericEmotionalTopicSwitch(text)
  if (emotional) return emotional

  for (const re of EXPLICIT_SWITCH_PATTERNS) {
    const m = re.exec(text)
    if (!m) continue
    const tail = cleanTopicTail(m[1] ?? '')
    if (!tail) {
      return { isTopicChange: true, topicHintText: null, needsClarification: true }
    }
    return { isTopicChange: true, topicHintText: tail, needsClarification: false }
  }

  const extended = tryExtendedTopicSwitchPatterns(text)
  if (extended) return extended

  return { isTopicChange: false, topicHintText: null, needsClarification: false }
}

/**
 * Тот же смысл, что и раньше: любая зафиксированная просьба сменить тему.
 * Используется для не-free_talk ветки в API; логика совпадает с detectFreeTalkTopicChange.
 */
export function isFixedTopicSwitchRequest(userText: string): boolean {
  return detectFreeTalkTopicChange(userText).isTopicChange
}

/**
 * Страховка для валидатора: явное намерение сменить тему (тот же детектор, что и ранний выход).
 */
export function looksLikeFreeTalkTopicSwitchIntent(userText: string): boolean {
  return detectFreeTalkTopicChange(userText).isTopicChange
}

/** Стабильные подстроки в ответе-переспросе (для распознавания следующего хода пользователя). */
export const TOPIC_CLARIFICATION_MARKER_CHILD =
  '1) New topic\n2) Same topic\n3) A new question'
export const TOPIC_CLARIFICATION_MARKER_ADULT =
  '1) Switch to a new topic\n2) Continue this topic\n3) Ask for a new question on this topic'

/** Старый формат (до нумерации) — только для isPoliteTopicClarificationAssistantMessage */
const LEGACY_TOPIC_CLARIFICATION_CHILD = 'Pick: new topic, same topic, or a new question.'
const LEGACY_TOPIC_CLARIFICATION_ADULT =
  'Pick: switch to a new topic, continue this topic, or ask for a new question on the same topic.'

/** Вежливый переспрос при неясной смене темы (free_talk). Диалог — только английский; child/adult различаются тоном. */
export function buildPoliteTopicClarificationReply(audience: 'child' | 'adult'): string {
  if (audience === 'child') {
    return [
      'Tell me more, please.',
      TOPIC_CLARIFICATION_MARKER_CHILD,
      'Say 1, 2, or 3 — or type new topic, same, or new question.',
    ].join('\n')
  }
  return [
    'I may not have understood — could you please clarify what you had in mind?',
    TOPIC_CLARIFICATION_MARKER_ADULT,
    'Reply with 1, 2, or 3 — or write your choice briefly.',
  ].join('\n')
}

export function isPoliteTopicClarificationAssistantMessage(content: string): boolean {
  if (!content.trim()) return false
  if (content.includes(TOPIC_CLARIFICATION_MARKER_CHILD) || content.includes(TOPIC_CLARIFICATION_MARKER_ADULT)) {
    return true
  }
  if (content.includes(LEGACY_TOPIC_CLARIFICATION_CHILD) || content.includes(LEGACY_TOPIC_CLARIFICATION_ADULT)) {
    return true
  }
  // Совместимость со старым текстом переспроса (до трёх вариантов)
  if (content.includes('Would you like to switch to a different topic, or continue with the current one?')) {
    return true
  }
  if (content.includes('New topic? Or the same?')) {
    return true
  }
  return false
}

export type TopicClarificationFollowupChoice = 'new_topic' | 'continue' | 'new_question'

/**
 * Распознаёт ответ пользователя после переспроса: новая тема / та же тема / новый вопрос по той же теме.
 */
export function detectTopicClarificationFollowupChoice(userText: string): TopicClarificationFollowupChoice | null {
  const text = normalizeSpaces(userText)
  if (!text) return null
  const lower = text.toLowerCase()

  // 1 / 2 / 3 (и «1.», «2)», «3!»)
  const digit = /^\s*([123])\s*[.!?:)]?\s*$/i.exec(text)
  if (digit) {
    const n = digit[1]
    if (n === '1') return 'new_topic'
    if (n === '2') return 'continue'
    return 'new_question'
  }

  if (
    /\bnew\s+question\b/i.test(lower) ||
    /new\s+вопрос/i.test(text) ||
    /новый\s+вопрос/i.test(text) ||
    /^другой\s+вопрос\s*[.!?]*$/i.test(text) ||
    /\banother\s+question\b/i.test(lower) ||
    /ещё\s+вопрос/i.test(text) ||
    /еще\s+вопрос/i.test(text)
  ) {
    return 'new_question'
  }

  if (
    /^(same|the same|continue|тот же|тоже|this\s+topic|this\s+one)\s*[.!?]*$/i.test(text) ||
    /^(same|the same)\s+topic\s*[.!?]*$/i.test(text) ||
    /^\s*продолж(?:ить|им)?\s*[.!?]*$/i.test(text)
  ) {
    return 'continue'
  }

  if (
    /^(new\s+topic|новая\s+тема|another\s+topic)\s*[.!?]*$/i.test(text) ||
    /^new\s*$/i.test(text)
  ) {
    return 'new_topic'
  }

  return null
}
