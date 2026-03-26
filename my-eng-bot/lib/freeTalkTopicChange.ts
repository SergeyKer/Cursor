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

const TOPIC_SWITCH_STOP_WORDS = new Set([
  'about', 'topic', 'talk', 'discuss', 'lets', "let's",
  'давай', 'давайте', 'тема', 'о', 'об', 'про', 'поговорим', 'поговорить', 'обсудим', 'обсудить',
  'please', 'pls', 'пожалуйста',
])

const TOPIC_SWITCH_NON_TOPIC_WORDS = new Set([
  'yes', 'no', 'ok', 'okay', 'thanks', 'thank', 'hi', 'hello', 'привет', 'ага', 'ок', 'спасибо',
])

const LIKELY_SENTENCE_VERBS = /\b(am|is|are|was|were|have|has|had|will|would|do|does|did|can|could|should|must|go|went|play|played|work|worked|swim|swam|love|like|want|хочу|люблю|буду|делаю|сделал|пойду|хотим|хотела)\b/i

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function cleanTopicTail(text: string): string {
  return normalizeSpaces(text.replace(/^[\s,:;.!?-]+|[\s,:;.!?-]+$/g, ''))
}

function extractWordTokens(text: string): string[] {
  return (text.match(/[A-Za-zА-Яа-яЁё']+/g) ?? []).map((t) => t.toLowerCase())
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

  const tokens = extractWordTokens(text)
  if (tokens.length === 0 || tokens.length > 4) {
    return { isTopicChange: false, topicHintText: null, needsClarification: false }
  }

  if (text.includes('?') || LIKELY_SENTENCE_VERBS.test(text)) {
    return { isTopicChange: false, topicHintText: null, needsClarification: false }
  }

  const contentTokens = tokens.filter((t) => !TOPIC_SWITCH_STOP_WORDS.has(t))
  if (contentTokens.length === 0 || contentTokens.every((t) => TOPIC_SWITCH_NON_TOPIC_WORDS.has(t))) {
    return { isTopicChange: false, topicHintText: null, needsClarification: false }
  }

  return {
    isTopicChange: true,
    topicHintText: contentTokens.join(' '),
    needsClarification: false,
  }
}
