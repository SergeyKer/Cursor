import type { LessonComposerPanelKind } from '@/lib/lessonComposerLayout'

/** Merge lock при смене incoming внутри одного шага (ширина, options). */
export function mergeComposerHeightLockOnParamChange(
  current: number | undefined,
  incoming: number,
  contentHeight: number
): number | undefined {
  const next = incoming > 0 ? incoming : undefined
  if (next == null) return undefined
  if (current == null) return next
  if (next < current) {
    if (contentHeight > 0 && contentHeight <= next) {
      return next
    }
    return current
  }
  return Math.max(current, next)
}

/** Sync lock по DOM-измерению (ResizeObserver). */
export function resolveComposerHeightLockSync(params: {
  panelKind: LessonComposerPanelKind
  measuredContent: number
  incoming: number
  current?: number
}): number | undefined {
  const { panelKind, measuredContent, incoming, current } = params
  if (measuredContent <= 0) return undefined

  if (panelKind === 'choice') {
    return measuredContent >= incoming ? Math.max(measuredContent, incoming) : measuredContent
  }

  const baseline = current ?? incoming
  const next = measuredContent > baseline ? measuredContent : baseline
  return next > 0 ? next : undefined
}
