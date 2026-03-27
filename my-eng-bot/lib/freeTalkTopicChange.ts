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

export function isFixedTopicSwitchRequest(userText: string): boolean {
  const text = normalizeSpaces(userText)
  if (!text) return false

  if (GENERIC_SWITCH_PATTERNS.some((re) => re.test(text))) {
    return true
  }

  if (EXPLICIT_SWITCH_PATTERNS.some((re) => re.test(text))) {
    return true
  }

  if (
    /^\s*(?:can\s+we|could\s+we|please)\s+(?:change|switch)\s+(?:the\s+)?topic(?:\s+to\s+.+)?\s*\??\s*$/i.test(text)
  ) {
    return true
  }

  if (/\b(?:change|switch)\s+(?:the\s+)?topic\b/i.test(text)) {
    return true
  }

  if (
    /^\s*(?:давай|давайте|можем|можно)\s+(?:сменим|сменить|поменяем|поменять)\s+тему(?:\s+на\s+.+)?\s*[.!?]*\s*$/i.test(text)
  ) {
    return true
  }

  return false
}

export function detectFreeTalkTopicChange(userText: string): FreeTalkTopicChangeDetection {
  const text = normalizeSpaces(userText)
  if (!text) {
    return { isTopicChange: false, topicHintText: null, needsClarification: false }
  }

  if (GENERIC_SWITCH_PATTERNS.some((re) => re.test(text))) {
    return { isTopicChange: true, topicHintText: null, needsClarification: true }
  }

  for (const re of EXPLICIT_SWITCH_PATTERNS) {
    const m = re.exec(text)
    if (!m) continue
    const tail = cleanTopicTail(m[1] ?? '')
    if (!tail) {
      return { isTopicChange: true, topicHintText: null, needsClarification: true }
    }
    return { isTopicChange: true, topicHintText: tail, needsClarification: false }
  }
  return { isTopicChange: false, topicHintText: null, needsClarification: false }
}
