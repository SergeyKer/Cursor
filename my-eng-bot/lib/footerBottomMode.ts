import { splitFooterStaticSegments } from '@/lib/footerStaticSegments'

export type FooterBottomMode = 'lesson' | 'sessionMeter' | 'static' | 'empty'

export type FooterSessionMeterLike = {
  target: number
} | null | undefined

export function resolveFooterBottomMode(params: {
  lessonFooterSegments?: readonly unknown[] | null
  sessionMeter?: FooterSessionMeterLike
  staticText?: string | null
}): FooterBottomMode {
  const hasLessonSegments = (params.lessonFooterSegments?.length ?? 0) > 0
  if (hasLessonSegments) return 'lesson'

  const hasSessionMeter = Boolean(params.sessionMeter && params.sessionMeter.target > 0)
  if (hasSessionMeter) return 'sessionMeter'

  const staticLine = typeof params.staticText === 'string' ? params.staticText.trim() : ''
  if (splitFooterStaticSegments(staticLine).length > 0 || staticLine.length > 0) {
    return 'static'
  }

  return 'empty'
}
