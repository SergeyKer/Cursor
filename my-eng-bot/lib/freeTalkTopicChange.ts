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

/** Короткие эмоциональные / отказ — без названия темы */
function tryGenericEmotionalTopicSwitch(text: string): FreeTalkTopicChangeDetection | null {
  if (/^\s*(?:наскучило|скучно|надоело)\s*[.!?]*\s*$/i.test(text)) {
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }
  if (/^\s*не\s+хочу\s+(?:про\s+это|об\s+этом)\s*[.!?]*\s*$/i.test(text)) {
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }
  if (/^\s*хватит\s*(?:про\s+это|про\s+этот|об\s+этом)?\s*[.!?]*\s*$/i.test(text)) {
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }
  if (/^\s*(?:i\s+)?(?:am\s+)?bored\s*[.!?]*\s*$/i.test(text)) {
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }
  if (/^\s*new\s+topic\s*[.!?]*\s*$/i.test(text)) {
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
