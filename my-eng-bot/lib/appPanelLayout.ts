import type { AppColumnBounds } from '@/hooks/useAppColumnBounds'

const COLUMN_FILLS_SHELL_RATIO = 0.85

export type AppPanelHorizontalLayout =
  | { left: 0; right: 0 }
  | { left: number; width: number }

export function shouldUseFullWidthAppPanel(columnBounds: AppColumnBounds): boolean {
  const shellWidth = Math.max(0, columnBounds.shellRight - columnBounds.shellLeft)
  const columnFillsShell =
    shellWidth > 0 && columnBounds.width / shellWidth >= COLUMN_FILLS_SHELL_RATIO
  return columnBounds.isPhoneViewport || columnBounds.isFullBleed || columnFillsShell
}

export function resolveAppPanelHorizontalLayout(
  columnBounds: AppColumnBounds | null | undefined
): AppPanelHorizontalLayout | undefined {
  if (!columnBounds) return undefined
  if (shouldUseFullWidthAppPanel(columnBounds)) {
    return { left: 0, right: 0 }
  }
  return {
    left: columnBounds.left,
    width: columnBounds.width,
  }
}

export function resolveAppPanelHorizontalStyle(
  columnBounds: AppColumnBounds | null | undefined
): { left: number; right: number; width?: number } {
  const layout = resolveAppPanelHorizontalLayout(columnBounds)
  if (!layout) {
    return { left: 0, right: 0 }
  }
  if ('right' in layout) {
    return { left: layout.left, right: layout.right }
  }
  return {
    left: layout.left,
    right: 0,
    width: layout.width,
  }
}
