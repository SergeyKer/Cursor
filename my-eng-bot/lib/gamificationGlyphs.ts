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

/** Dynamic footer voice: links label COMBO to the 🔥 streak icon. */
export function formatComboFooterVoiceLabel(combo: number, tail = ''): string {
  const n = Math.max(0, Math.floor(combo))
  return `${COMBO_GLYPH} COMBO ×${n}${tail}`
}

/** COMBO milestone below 50% core: streak already counts in this lesson run. */
export function formatComboMilestoneBlockedVoice(
  combo: number,
  audience: 'adult' | 'child' = 'adult'
): string {
  const tail = audience === 'child' ? ' — уже в счёте!' : ' — в счёте урока.'
  return formatComboFooterVoiceLabel(combo, tail)
}

export function formatComboMilestoneBlockedCelebration(
  combo: number,
  audience: 'adult' | 'child' = 'adult'
): string {
  const tail = audience === 'child' ? '! Уже в счёте!' : '! COMBO в счёте урока.'
  return formatComboFooterVoiceLabel(combo, tail)
}
