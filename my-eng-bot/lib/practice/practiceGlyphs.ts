export const PRACTICE_PROGRESS_GLYPH = '📝'
export const TOPIC_CUP_GLYPH = '🏆'
export const PRACTICE_RING_MAX = 5

export function formatPracticeProgressText(ringCount: number, max = PRACTICE_RING_MAX): string {
  return `${PRACTICE_PROGRESS_GLYPH} ${ringCount}/${max}`
}

export function formatTopicCupBadgeText(): string {
  return TOPIC_CUP_GLYPH
}

export function formatPracticeOpportunityLabel(topic: string, ringCount: number): string {
  return `${topic}: ${formatPracticeProgressText(ringCount)}`
}

export function formatPracticeOpportunityLabelWithGoldMedal(topic: string, ringCount: number): string {
  return `${topic}: 🥇 ${formatPracticeProgressText(ringCount)}`
}
