export const FOOTER_SHEET_SCROLL_EDGE_EPSILON = 1

export type FooterSheetBodyScrollMetrics = {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
}

export function readFooterSheetBodyScrollMetrics(
  element: HTMLElement | null | undefined
): FooterSheetBodyScrollMetrics {
  if (!element) {
    return { scrollTop: 0, clientHeight: 0, scrollHeight: 0 }
  }
  return {
    scrollTop: element.scrollTop,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }
}

export function canFooterSheetBodyScrollUp(
  metrics: FooterSheetBodyScrollMetrics,
  epsilon = FOOTER_SHEET_SCROLL_EDGE_EPSILON
): boolean {
  return metrics.scrollTop + metrics.clientHeight < metrics.scrollHeight - epsilon
}

export function canFooterSheetBodyScrollDown(
  metrics: FooterSheetBodyScrollMetrics,
  epsilon = FOOTER_SHEET_SCROLL_EDGE_EPSILON
): boolean {
  return metrics.scrollTop > epsilon
}

export function shouldDelegateFooterSheetTouchToBodyScroll(args: {
  startedFromBody: boolean
  deltaY: number
  metrics: FooterSheetBodyScrollMetrics
}): boolean {
  if (!args.startedFromBody || args.deltaY === 0) return false
  if (args.deltaY < 0) return canFooterSheetBodyScrollUp(args.metrics)
  return canFooterSheetBodyScrollDown(args.metrics)
}
