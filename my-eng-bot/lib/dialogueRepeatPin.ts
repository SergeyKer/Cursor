/**
 * Закрепление эталона «Повтори:» в цикле исправлений диалога (не translation).
 * Первое валидное английское предложение после последнего ассистентского хода без «Повтори»
 * становится эталоном до следующего «чистого» вопроса в истории.
 */

export interface DialogueMessageLike {
  role: string
  content: string
}

const REPEAT_LINE_ANYWHERE = /(^|\n)\s*(?:Скажи|Say|Повтори|Repeat)\s*:/im

export function dialogueAssistantHasRepeatLine(content: string): boolean {
  return REPEAT_LINE_ANYWHERE.test(content)
}

function isEnglishQuestionSentence(text: string): boolean {
  const s = text.trim()
  if (!s) return false
  if (!/\?\s*$/.test(s)) return false
  return /[A-Za-z]/.test(s)
}

const INCOMPLETE_TAIL_TOKENS = new Set([
  'to',
  'and',
  'or',
  'but',
  'because',
  'if',
  'when',
  'while',
  'that',
  'which',
  'who',
  'whom',
  'whose',
  'where',
  'after',
  'before',
  'with',
  'without',
  'for',
  'from',
  'in',
  'on',
  'at',
  'of',
  'about',
])

function looksLikeIncompleteOrOverflowRepeat(text: string, words: string[]): boolean {
  const lowerWords = words.map((w) => w.toLowerCase())
  const lastWord = lowerWords[lowerWords.length - 1] ?? ''
  if (INCOMPLETE_TAIL_TOKENS.has(lastWord)) return true
  if (words.length > 22) return true
  const sentencePunctuationCount = (text.match(/[.!?]/g) ?? []).length
  if (sentencePunctuationCount > 1) return true
  return false
}

/** Минимальная здравость тела «Повтори» для закрепления (отсекаем обрубки вроде «... 2.»). */
export function isDialogueRepeatPinCandidate(englishRepeatBody: string): boolean {
  const t = englishRepeatBody.trim()
  if (!t) return false
  if (!/[A-Za-z]/.test(t)) return false
  if (/[А-Яа-яЁё]/.test(t)) return false
  if (isEnglishQuestionSentence(t)) return false
  if (/^(?:it'?s\s+great|great!|great\b|excellent\b|nice\b|well done\b|good job\b)/i.test(t)) return false
  const words = t
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length < 3) return false
  if (looksLikeIncompleteOrOverflowRepeat(t, words)) return false
  const last = words[words.length - 1] ?? ''
  if (/^\d+$/.test(last)) return false
  return true
}

const REPEAT_LINE_START = /^[\s\-•]*(?:\d+[\.)]\s*)*(Скажи|Say|Повтори|Repeat)\s*:\s*(.*)$/i

function stripAssistantPrefix(line: string): string {
  return line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
}

function extractRepeatBodyFromAssistantContent(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => stripAssistantPrefix(l))
    .filter(Boolean)
  for (const line of lines) {
    const m = REPEAT_LINE_START.exec(line)
    if (m?.[2]) {
      const body = m[2].trim()
      if (body) return body
    }
  }
  return null
}

/**
 * Первое по времени тело «Повтори»/«Скажи» после последнего ассистентского сообщения без маркера повтора.
 * Если вся история ассистента только с повторами — null (не закрепляем).
 */
export function findDialoguePinCandidateFromMessages(messages: DialogueMessageLike[]): string | null {
  let boundaryIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role !== 'assistant') continue
    if (!dialogueAssistantHasRepeatLine(m.content)) {
      boundaryIdx = i
      break
    }
  }
  if (boundaryIdx === -1) return null

  for (let i = boundaryIdx + 1; i < messages.length; i++) {
    const m = messages[i]
    if (m?.role !== 'assistant') continue
    const body = extractRepeatBodyFromAssistantContent(m.content)
    if (body && isDialogueRepeatPinCandidate(body)) return body
  }
  return null
}
