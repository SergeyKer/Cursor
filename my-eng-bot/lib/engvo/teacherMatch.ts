import { extractTeacherCorrection } from '@/lib/learningMemory/teacherCorrection'
import type { LanguageNote } from '@/lib/languageNote/types'
import type { ChatMessage } from '@/lib/types'
import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'

export type TeacherMatchAttach =
  | { kind: 'accepted'; note: LanguageNote }
  | { kind: 'error'; expectedEnglish: string }

const LATIN_RE = /[A-Za-z]/

/** Local already_good tip for teacher SUCCESS — no API. */
export function buildTeacherAcceptedNote(userText: string): LanguageNote {
  const text = userText.trim()
  return {
    status: 'already_good',
    original: text,
    correct: text,
    correctHighlights: [],
    correctReasons: [LANGUAGE_NOTE_COPY.teacherAcceptedReason],
    better: null,
    betterHighlights: [],
    betterReasons: [],
    betterAlternatives: [],
    reviewTopics: [],
    lessonId: null,
    lessonTitle: null,
  }
}

/**
 * Resolve attach from teacher drill assistant turn.
 * Skip empty / non-English attempts (topic RU / meta).
 */
export function resolveTeacherMatchAttach(params: {
  assistantRawText: string
  userText: string
}): TeacherMatchAttach | null {
  const userText = params.userText.trim()
  if (!userText || !LATIN_RE.test(userText)) return null

  const extracted = extractTeacherCorrection(params.assistantRawText)
  if (extracted.corrected?.trim()) {
    return { kind: 'error', expectedEnglish: extracted.corrected.trim() }
  }

  return { kind: 'accepted', note: buildTeacherAcceptedNote(userText) }
}

export function findLastUserMessageIndex(messages: readonly ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === 'user' && !message.engvoServiceLine) return i
  }
  return -1
}

/** Idempotent patch of a user bubble with teacher match data. */
export function applyTeacherMatchAttach(
  message: ChatMessage,
  attach: TeacherMatchAttach
): ChatMessage {
  if (message.role !== 'user') return message

  if (attach.kind === 'error') {
    if (message.teacherExpectedEnglish === attach.expectedEnglish && !message.languageNote) {
      return message
    }
    return {
      ...message,
      teacherExpectedEnglish: attach.expectedEnglish,
      languageNote: undefined,
    }
  }

  if (
    message.languageNote?.status === 'already_good' &&
    !message.teacherExpectedEnglish &&
    message.languageNote.original === attach.note.original
  ) {
    return message
  }

  return {
    ...message,
    languageNote: attach.note,
    teacherExpectedEnglish: undefined,
  }
}

export function patchMessagesWithTeacherMatchAttach(
  messages: ChatMessage[],
  attach: TeacherMatchAttach | null
): ChatMessage[] {
  if (!attach) return messages
  const userIdx = findLastUserMessageIndex(messages)
  if (userIdx < 0) return messages
  const current = messages[userIdx]
  if (!current) return messages
  const nextUser = applyTeacherMatchAttach(current, attach)
  if (nextUser === current) return messages
  const next = [...messages]
  next[userIdx] = nextUser
  return next
}
