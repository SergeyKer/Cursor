import type { FooterVoiceEmphasis, FooterVoiceTone } from '@/lib/footerVoice'
import type { LessonFooterSegmentKind } from '@/lib/lessonFooter'

export type FooterSheetSource = 'dynamic' | 'static'
export type FooterSheetMode = 'placeholder' | 'smart'

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
}

export const FOOTER_SHEET_PLACEHOLDER_TEXT = 'В разработке'

export function resolveFooterSheetTitle(source: FooterSheetSource): string {
  return source === 'dynamic' ? 'Подсказка' : 'Статистика'
}

export interface BuildFooterSheetContextParams {
  source: FooterSheetSource
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

export function shouldCloseFooterSheetOnRowPress(
  current: FooterSheetContext | null,
  source: FooterSheetSource
): boolean {
  return current?.source === source
}
