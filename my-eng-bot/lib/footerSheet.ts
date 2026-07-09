import type { FooterVoiceEmphasis, FooterVoiceTone } from '@/lib/footerVoice'
import type { LessonFooterSegmentKind } from '@/lib/lessonFooter'
import type { LanguageNote } from '@/lib/languageNote/types'
import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'

export type FooterSheetSource = 'dynamic' | 'static' | 'language-note'
export type FooterSheetMode = 'placeholder' | 'smart'
export type LanguageNoteSheetStatus = 'loading' | 'ready' | 'error'

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
}

export const FOOTER_SHEET_PLACEHOLDER_TEXT = 'В разработке'

export function resolveFooterSheetTitle(source: FooterSheetSource): string {
  if (source === 'language-note') return LANGUAGE_NOTE_COPY.sheetTitle
  return source === 'dynamic' ? 'Подсказка' : 'Статистика'
}

export interface BuildFooterSheetContextParams {
  source: Exclude<FooterSheetSource, 'language-note'>
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

export function shouldCloseFooterSheetOnRowPress(
  current: FooterSheetContext | null,
  source: FooterSheetSource
): boolean {
  if (!current) return false
  if (current.source === 'language-note') return true
  return current.source === source
}
