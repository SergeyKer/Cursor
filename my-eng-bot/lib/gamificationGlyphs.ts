export const DAILY_STREAK_GLYPH = '⚡'
export const COMBO_GLYPH = '🔥'
export const DAILY_STREAK_LABEL = 'Серия дней'
export const COMBO_LABEL = 'COMBO'

export function formatDailyStreakFooter(value: number): string {
  return `${DAILY_STREAK_GLYPH}${Math.max(0, Math.floor(value))}`
}

export function formatComboSegmentText(combo: number, suffix = ''): string {
  const n = Math.max(0, Math.floor(combo))
  return suffix ? `${COMBO_GLYPH}×${n}${suffix}` : `${COMBO_GLYPH}×${n}`
}
