import { isRepeatSemanticallySafe } from './dialogueSemanticGuard'
import { validateDialogueRepeatTense } from './dialogueOutputValidation'

const REPEAT_DENYLIST_TOKENS = new Set(['hased', 'wontn'])
const REPEAT_INCOMPLETE_TAIL_TOKENS = new Set([
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

function tokenizeRepeat(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z']+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

export function isRepeatLexicallyPlausible(repeatEnglish: string): boolean {
  const trimmed = repeatEnglish.trim()
  if (!trimmed) return false

  const tokens = tokenizeRepeat(trimmed)
  if (tokens.length > 28) return false
  if (tokens.some((token) => REPEAT_DENYLIST_TOKENS.has(token))) return false
  const lastToken = tokens[tokens.length - 1] ?? ''
  if (REPEAT_INCOMPLETE_TAIL_TOKENS.has(lastToken)) return false
  if (/\bthe\s+prepare\b/i.test(trimmed)) return false
  if (/\b\d+\s*[.!?]?$/i.test(trimmed) && tokens.length >= 3) return false

  return true
}

export type DialogueRepeatValidationParams = {
  repeatEnglish: string
  userText: string
  requiredTense: string
  priorAssistantContent: string | null
}

export function isDialogueRepeatAcceptable(params: DialogueRepeatValidationParams): boolean {
  const repeatEnglish = params.repeatEnglish.trim()
  if (!repeatEnglish) return false
  if (!/[A-Za-z]/.test(repeatEnglish)) return false
  if (/[А-Яа-яЁё]/.test(repeatEnglish)) return false
  if (repeatEnglish.length > 400) return false

  if (!validateDialogueRepeatTense({
    repeatEnglish,
    requiredTense: params.requiredTense,
    priorAssistantContent: params.priorAssistantContent,
  })) {
    return false
  }

  if (!isRepeatSemanticallySafe({ userText: params.userText, repeatSentence: repeatEnglish })) {
    return false
  }

  return isRepeatLexicallyPlausible(repeatEnglish)
}
