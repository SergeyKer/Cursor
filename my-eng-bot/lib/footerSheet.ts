import type { FooterVoiceEmphasis, FooterVoiceTone } from '@/lib/footerVoice'
import type { LessonFooterSegmentKind } from '@/lib/lessonFooter'
import type { CallReviewSession } from '@/lib/engvo/callReview/types'
import type { LanguageNote } from '@/lib/languageNote/types'
import { CALL_REVIEW_COPY } from '@/lib/uiCopy/callReview'
import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'

export type FooterSheetSource = 'dynamic' | 'static' | 'language-note' | 'call-review'
export type FooterSheetMode = 'placeholder' | 'smart'
export type LanguageNoteSheetStatus = 'loading' | 'ready' | 'error'
export type CallReviewSheetStatus = 'ready'

export interface FooterSheetContext {
  source: FooterSheetSource
  title: string
  mode: FooterSheetMode
  typingKey?: string | number | null
  tone?: FooterVoiceTone
  emphasis?: FooterVoiceEmphasis
  dynamicText?: string | null
  staticText?: string | null
  lessonTitle?: string | null
  segmentKinds?: LessonFooterSegmentKind[]
  languageNoteStatus?: LanguageNoteSheetStatus | null
  languageNote?: LanguageNote | null
  languageNoteError?: string | null
  languageNoteMessageIndex?: number | null
  languageNoteOriginalText?: string | null
  callReviewStatus?: CallReviewSheetStatus | null
  callReviewSession?: CallReviewSession | null
}

export const FOOTER_SHEET_PLACEHOLDER_TEXT = 'В разработке'

/** Same visual skin as Language Note (bg/height/head). */
export function isLanguageNoteSkin(source: FooterSheetSource): boolean {
  return source === 'language-note' || source === 'call-review'
}

export function resolveFooterSheetTitle(source: FooterSheetSource): string {
  if (source === 'language-note' || source === 'call-review') return LANGUAGE_NOTE_COPY.sheetTitle
  return source === 'dynamic' ? 'Подсказка' : 'Статистика'
}

export interface BuildFooterSheetContextParams {
  source: Exclude<FooterSheetSource, 'language-note' | 'call-review'>
  dynamicText?: string | null
  staticText?: string | null
  typingKey?: string | number | null
  tone?: FooterVoiceTone
  emphasis?: FooterVoiceEmphasis
  lessonTitle?: string | null
  segmentKinds?: LessonFooterSegmentKind[]
}

export function buildFooterSheetContext(
  params: BuildFooterSheetContextParams
): FooterSheetContext {
  return {
    source: params.source,
    title: resolveFooterSheetTitle(params.source),
    mode: 'placeholder',
    typingKey: params.typingKey ?? null,
    tone: params.tone,
    emphasis: params.emphasis,
    dynamicText: params.dynamicText ?? null,
    staticText: params.staticText ?? null,
    lessonTitle: params.lessonTitle ?? null,
    segmentKinds: params.segmentKinds ?? [],
  }
}

export type BuildLanguageNoteFooterSheetContextParams = {
  status: LanguageNoteSheetStatus
  messageIndex: number
  originalText: string
  note?: LanguageNote | null
  error?: string | null
}

export function buildLanguageNoteFooterSheetContext(
  params: BuildLanguageNoteFooterSheetContextParams
): FooterSheetContext {
  return {
    source: 'language-note',
    title: LANGUAGE_NOTE_COPY.sheetTitle,
    mode: 'smart',
    languageNoteStatus: params.status,
    languageNote: params.note ?? null,
    languageNoteError: params.error ?? null,
    languageNoteMessageIndex: params.messageIndex,
    languageNoteOriginalText: params.originalText,
  }
}

export function buildCallReviewFooterSheetContext(
  session: CallReviewSession
): FooterSheetContext {
  return {
    source: 'call-review',
    title: CALL_REVIEW_COPY.sheetTitle,
    mode: 'smart',
    callReviewStatus: 'ready',
    callReviewSession: session,
  }
}

export function shouldCloseFooterSheetOnRowPress(
  current: FooterSheetContext | null,
  source: FooterSheetSource
): boolean {
  if (!current) return false
  if (current.source === 'language-note' || current.source === 'call-review') return true
  return current.source === source
}
