/**
 * Эвристики времени для диалога: извлечение английского вопроса из сообщения ассистента
 * и вывод tense для согласования «Повтори» с последним вопросом (режим «все времена» и др.).
 */

/** От более специфичных паттернов к общим — первое совпадение выигрывает. */
export const DIALOGUE_TENSE_INFERENCE_ORDER: readonly string[] = [
  'future_perfect_continuous',
  'present_perfect_continuous',
  'past_perfect_continuous',
  'future_perfect',
  'past_perfect',
  'future_continuous',
  'past_continuous',
  'present_continuous',
  'future_simple',
  'present_perfect',
  'past_simple',
  'present_simple',
]

const PROTO_LINE =
  /^(Комментарий|Повтори|Repeat|Say|Время|Конструкция|Перевод|RU:|Translation|AI:|Assistant)\s*:/i

function stripAssistantPrefix(line: string): string {
  return line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
}

export function getDialogueRepeatSentence(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => stripAssistantPrefix(l))
    .filter(Boolean)
  const repeatLine = lines.find((line) => /^(Повтори|Repeat|Say)\s*:/i.test(line))
  if (!repeatLine) return null
  const repeatText = repeatLine.replace(/^(Повтори|Repeat|Say)\s*:\s*/i, '').trim()
  return repeatText || null
}

export function isLikelyQuestionInRequiredTense(question: string, requiredTense: string): boolean {
  const q = question.trim()
  if (!q) return false
  const expanded = q
    .replace(/\b(i)\s*'\s*m\b/gi, '$1 am')
    .replace(/\b(you|we|they)\s*'\s*re\b/gi, '$1 are')
    .replace(/\b(he|she|it)\s*'\s*s\b/gi, '$1 is')
    .replace(/\b(i|you|we|they)\s*'\s*ve\b/gi, '$1 have')
    .replace(/\b(he|she|it)\s*'\s*s\b(?=\s+[a-z]+ed\b|\s+been\b|\s+[a-z]+ing\b)/gi, '$1 has')
  const lower = expanded.toLowerCase()

  switch (requiredTense) {
    case 'present_simple':
      return /\b(do|does)\s+you\b/i.test(lower) || /\b(am|is|are)\s+(?:i|you|we|they|he|she|it)\b/i.test(lower)
    case 'present_continuous':
      return /\b(am|is|are)\s+(?:i|you|we|they|he|she|it)\b.*\b[a-z]+ing\b/i.test(lower)
    case 'past_simple':
      return /\b(did|was|were)\s+(?:i|you|we|they|he|she|it)\b/i.test(lower)
    case 'past_continuous':
      return /\b(was|were)\s+(?:i|you|we|they|he|she|it)\b.*\b[a-z]+ing\b/i.test(lower)
    case 'future_simple':
      return /\bwill\s+(?:i|you|we|they|he|she|it)\b/i.test(lower)
    case 'present_perfect':
      return /\b(have|has)\s+(?:i|you|we|they|he|she|it)\b/i.test(lower)
    case 'present_perfect_continuous':
      return /\b(have|has)\s+(?:i|you|we|they|he|she|it)\b.*\bbeen\b.*\b[a-z]+ing\b/i.test(lower)
    case 'past_perfect':
      return /\bhad\s+(?:i|you|we|they|he|she|it)\b/i.test(lower)
    case 'past_perfect_continuous':
      return /\bhad\s+(?:i|you|we|they|he|she|it)\b.*\bbeen\b.*\b[a-z]+ing\b/i.test(lower)
    case 'future_continuous':
      return /\bwill\s+(?:i|you|we|they|he|she|it)\s+be\b.*\b[a-z]+ing\b/i.test(lower)
    case 'future_perfect':
      return /\bwill\s+(?:i|you|we|they|he|she|it)\s+have\b/i.test(lower)
    case 'future_perfect_continuous':
      return /\bwill\s+(?:i|you|we|they|he|she|it)\s+have\s+been\b.*\b[a-z]+ing\b/i.test(lower)
    default:
      return false
  }
}

export function isUserLikelyCorrectForTense(userText: string, requiredTense: string): boolean {
  const expandedText = userText
    .replace(/\b(i)\s*'\s*m\b/gi, '$1 am')
    .replace(/\b(you|we|they)\s*'\s*re\b/gi, '$1 are')
    .replace(/\b(he|she|it)\s*'\s*s\b/gi, '$1 is')
    .replace(/\b(i|you|we|they)\s*'\s*ve\b/gi, '$1 have')
    .replace(/\b(he|she|it)\s*'\s*s\b(?=\s+[a-z]+ed\b|\s+been\b|\s+[a-z]+ing\b)/gi, '$1 has')
  const lower = expandedText.trim().toLowerCase()
  if (!lower) return false

  switch (requiredTense) {
    case 'present_simple': {
      if (/\b(am|is|are)\s+[a-z]+ing\b/i.test(userText)) return false
      if (
        /\b(yesterday|ago|last|before|went|was|were|did|had|made|saw|took|came|got|gave|said|told|knew|thought|felt|left|kept|found|wrote|read|ran|drove|ate|drank|slept|spoke|bought|brought)\b/i.test(
          userText
        )
      ) {
        return false
      }
      const lowerInner = userText.trim().toLowerCase()

      const mPron = /^\s*(he|she|it)\s+([a-z]+)\b/i.exec(lowerInner)
      if (mPron) {
        const verb = mPron[2]
        if (/^(is|has|does)$/.test(verb)) return true
        return /(s|es)$/.test(verb)
      }

      const mPoss = /^\s*(my|your|his|her)\s+[a-z]+\s+([a-z]+)\b/i.exec(lowerInner)
      if (mPoss) {
        const verb = mPoss[2]
        if (/^(is|has|does)$/.test(verb)) return true
        return /(s|es)$/.test(verb)
      }

      const mDet = /^\s*(a|an|the)\s+[a-z]+\s+([a-z]+)\b/i.exec(lowerInner)
      if (mDet) {
        const verb = mDet[2]
        if (/^(is|has|does)$/.test(verb)) return true
        return /(s|es)$/.test(verb)
      }

      const mPluralPron = /^\s*(i|you|we|they)\s+([a-z]+)\b/i.exec(lowerInner)
      if (mPluralPron) {
        const verb = mPluralPron[2]
        if (/^(is|has|does)$/.test(verb)) return false
        if (/(s|es)$/.test(verb)) return false
        return true
      }

      return true
    }
    case 'present_continuous':
      return /\b(am|is|are)\s+[a-z]+ing\b/i.test(expandedText) && !/\b(was|were|did|had)\b/i.test(expandedText)
    case 'past_continuous':
      return /\b(was|were)\s+[a-z]+ing\b/i.test(expandedText)
    case 'past_simple':
      return (
        /\b(went|was|were|did|had|made|saw|took|came|got|gave|said|told|knew|thought|felt|left|kept|found|wrote|read|ran|drove|ate|drank|slept|spoke|bought|brought)\b/i.test(
          userText
        ) || /\b[a-z]{3,}ed\b/i.test(userText)
      )
    case 'future_simple':
      // Исключаем FP ("will have") и FPC ("will have been")
      return /\bwill\s+[a-z]/i.test(expandedText) && !/\bwill\s+have\b/i.test(expandedText)
    case 'present_perfect':
      // Исключаем PPC ("have/has been …ing")
      return /\b(have|has)\b/i.test(expandedText) && !/\b(have|has)\b.*\bbeen\b.*[a-z]+ing\b/i.test(expandedText)
    case 'present_perfect_continuous':
      return /\b(have|has)\b.*\bbeen\b.*[a-z]+ing\b/i.test(expandedText)
    case 'past_perfect':
      // Исключаем PaPC ("had been …ing")
      return /\bhad\b/i.test(expandedText) && !/\bhad\b.*\bbeen\b.*[a-z]+ing\b/i.test(expandedText)
    case 'past_perfect_continuous':
      return /\bhad\b.*\bbeen\b.*[a-z]+ing\b/i.test(expandedText)
    case 'future_continuous':
      return /\bwill\s+be\b.*[a-z]+ing\b/i.test(expandedText)
    case 'future_perfect':
      // Исключаем FPC ("will have been …ing")
      return /\bwill\s+have\b/i.test(expandedText) && !/\bwill\s+have\s+been\b.*[a-z]+ing\b/i.test(expandedText)
    case 'future_perfect_continuous':
      return /\bwill\s+have\s+been\b.*[a-z]+ing\b/i.test(expandedText)
    default:
      return true
  }
}

/** Строка похожа на английский вопрос без знака вопроса (голос/опечатка). */
export function looksLikeEnglishQuestionWithoutMark(line: string): boolean {
  const s = line.trim()
  if (s.length < 10 || !/[A-Za-z]/.test(s)) return false
  if (/\?\s*$/.test(s)) return false
  if (/[А-Яа-яЁё]/.test(s) && !/^(What|When|Where|Why|How|Who|Which|Do|Does|Did|Is|Are|Was|Were|Have|Has|Had|Will|Would|Can|Could)\b/i.test(s.trim())) {
    return false
  }
  return /^(what|when|where|why|how|who|which|whose|do|does|did|is|are|am|was|were|have|has|had|will|would|can|could|should|may|might|must)\b/i.test(
    s.toLowerCase()
  )
}

function normalizeDialogueLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => stripAssistantPrefix(l))
    .filter(Boolean)
}

/**
 * Кандидаты вопросов: сначала строки с «?» снизу вверх, затем похожие на вопрос без «?».
 */
export function collectCandidateEnglishQuestionLines(content: string): string[] {
  const lines = normalizeDialogueLines(content)
  const out: string[] = []
  const seen = new Set<string>()

  const push = (line: string) => {
    const t = line.trim()
    if (!t || PROTO_LINE.test(t)) return
    if (!/[A-Za-z]/.test(t)) return
    if (seen.has(t)) return
    seen.add(t)
    out.push(t)
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i] ?? ''
    if (/\?\s*$/.test(line)) push(line)
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i] ?? ''
    if (/\?\s*$/.test(line)) continue
    if (looksLikeEnglishQuestionWithoutMark(line)) push(line)
  }
  return out
}

function inferFirstMatchingTenseForQuestionLine(q: string): string | null {
  for (const tense of DIALOGUE_TENSE_INFERENCE_ORDER) {
    if (isLikelyQuestionInRequiredTense(q, tense)) return tense
  }
  return null
}

/** Fallback: последние английские непротокольные строки склеиваем и пробуем паттерны времён. */
export function inferTenseFromAssistantTextTail(content: string): string | null {
  const lines = normalizeDialogueLines(content).filter((l) => !PROTO_LINE.test(l.trim()))
  const english = lines.filter((l) => /[A-Za-z]/.test(l))
  if (english.length === 0) return null
  const tail = english.slice(-4).join(' ')
  if (tail.length < 8) return null
  for (const tense of DIALOGUE_TENSE_INFERENCE_ORDER) {
    if (isLikelyQuestionInRequiredTense(tail, tense)) return tense
  }
  return null
}

export function inferTenseFromDialogueAssistantContent(content: string): string | null {
  const candidates = collectCandidateEnglishQuestionLines(content)
  for (const q of candidates) {
    const t = inferFirstMatchingTenseForQuestionLine(q)
    if (t) return t
  }
  const repeat = getDialogueRepeatSentence(content)
  if (repeat) {
    for (const tense of DIALOGUE_TENSE_INFERENCE_ORDER) {
      if (isUserLikelyCorrectForTense(repeat, tense)) return tense
    }
  }
  return inferTenseFromAssistantTextTail(content)
}
