import type { Bubble } from '@/types/lesson'

export const PRACTICE_SECTION_PAUSE_MS = 100

export const PRACTICE_TYPEWRITER_WORD_MS_BY_SECTION: Record<Bubble['type'], number> = {
  positive: 20,
  info: 22,
  task: 30,
}

/** Фидбек и service-строки в ленте практики. */
export const PRACTICE_FEEDBACK_TYPEWRITER_WORD_MS = 26

export function practiceTypewriterSpeedForSection(type: Bubble['type']): number {
  return PRACTICE_TYPEWRITER_WORD_MS_BY_SECTION[type]
}
