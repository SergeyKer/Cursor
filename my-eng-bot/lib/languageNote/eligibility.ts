import { featureFlags } from '@/lib/featureFlags'
import type { AppMode, CommunicationVoiceInputMode } from '@/lib/types'
import { LANGUAGE_NOTE_MAX_INPUT_CHARS } from '@/lib/languageNote/types'

const STOP_TOKENS = new Set([
  'ok',
  'okay',
  'yes',
  'no',
  'yeah',
  'yep',
  'nope',
  'hi',
  'hey',
  'hello',
  'bye',
  'haha',
  'hahaha',
  'lol',
  'thanks',
  'thank',
  'thx',
  '+',
])

const RU_STOP_TOKENS = new Set([
  'ок',
  'окей',
  'да',
  'нет',
  'привет',
  'пока',
  'спасибо',
  'благодарю',
  'ага',
  'угу',
  'лол',
])

const LATIN_RE = /[A-Za-z]/
const CYRILLIC_RE = /\p{Script=Cyrillic}/u
const EMOJI_OR_SYMBOL_ONLY_RE = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s\p{P}\p{S}+]+$/u

export function canShowLanguageNoteInfo(
  content: string,
  options?: { voiceMode?: CommunicationVoiceInputMode | null }
): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  if (trimmed.length > LANGUAGE_NOTE_MAX_INPUT_CHARS * 2) return false

  const allowCyrillicOnly = options?.voiceMode === 'ru'
  const hasLatin = LATIN_RE.test(trimmed)
  const hasCyrillic = CYRILLIC_RE.test(trimmed)
  if (!hasLatin && !(allowCyrillicOnly && hasCyrillic)) return false

  const normalized = trimmed.toLowerCase().replace(/[.!?…]+$/g, '').trim()
  if (STOP_TOKENS.has(normalized)) return false
  if (allowCyrillicOnly && RU_STOP_TOKENS.has(normalized)) return false
  if (EMOJI_OR_SYMBOL_ONLY_RE.test(trimmed) && !LATIN_RE.test(trimmed.replace(/[A-Za-z]/g, ''))) {
    return false
  }
  if (/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s]+$/u.test(trimmed)) return false

  return true
}

export function shouldShowLanguageNoteMark(params: {
  mode: AppMode
  engvoVoiceMode: boolean
  content: string
  isEngvoServiceLine?: boolean
  /** Active Engvo call (not ended) — hide mark so tips don't burn call tokens mid-call. */
  callInProgress?: boolean
  featureEnabled?: boolean
  communicationVoiceInputMode?: CommunicationVoiceInputMode | null
}): boolean {
  const flagOn = params.featureEnabled ?? featureFlags.languageNoteV1
  if (!flagOn) return false
  if (params.isEngvoServiceLine) return false

  const inScope = params.engvoVoiceMode || params.mode === 'communication'
  if (!inScope) return false

  // During an active call the mark exists in eligibility history but must stay invisible
  // until hang-up; tips can be opened thoughtfully afterwards.
  if (params.engvoVoiceMode && params.callInProgress) return false

  const voiceMode =
    params.engvoVoiceMode || params.mode !== 'communication'
      ? null
      : (params.communicationVoiceInputMode ?? null)

  return canShowLanguageNoteInfo(params.content, { voiceMode })
}

export function truncateLanguageNoteInput(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= LANGUAGE_NOTE_MAX_INPUT_CHARS) return trimmed
  return trimmed.slice(0, LANGUAGE_NOTE_MAX_INPUT_CHARS).trim()
}
