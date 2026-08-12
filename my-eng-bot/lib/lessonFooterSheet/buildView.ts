import type {
  BuildLessonFooterSheetViewInput,
  LessonFooterSheetView,
} from '@/lib/lessonFooterSheet/types'
import {
  LESSON_FOOTER_SHEET_TITLE,
  lessonFooterSheetMomentCopy,
  lessonFooterSheetNowTitle,
  lessonFooterSheetStatusTitle,
  pickAudienceText,
} from '@/lib/uiCopy/lessonFooterSheet'

function trimText(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Builds sheet cards for a lesson moment. Prefers live footer lines when present.
 */
export function buildLessonFooterSheetView(
  input: BuildLessonFooterSheetViewInput
): LessonFooterSheetView {
  const copy = lessonFooterSheetMomentCopy(input.moment)
  const audience = input.audience
  const dynamic = trimText(input.dynamicText)
  const staticLine = trimText(input.statusLine) || trimText(input.staticText)
  const lessonTitle = trimText(input.lessonTitle)

  const nowBody =
    dynamic ||
    (lessonTitle && (input.moment === 'intro' || input.moment === 'reference')
      ? `${pickAudienceText(audience, copy.nowFallback)} «${lessonTitle}».`
      : pickAudienceText(audience, copy.nowFallback))

  const statusBody = staticLine || pickAudienceText(audience, copy.statusFallback)

  return {
    moment: input.moment,
    title: LESSON_FOOTER_SHEET_TITLE,
    now: {
      marker: copy.nowMarker,
      title: lessonFooterSheetNowTitle(audience),
      body: nowBody,
    },
    status: {
      marker: copy.statusMarker,
      title: lessonFooterSheetStatusTitle(audience),
      body: statusBody,
    },
  }
}
