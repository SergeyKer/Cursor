import type { Bubble } from '@/types/lesson'

export const PRACTICE_SECTION_PAUSE_MS = 100

export const PRACTICE_TYPEWRITER_WORD_MS_BY_SECTION: Record<Bubble['type'], number> = {
  positive: 20,
  info: 22,
  task: 30,
}

/** Фидбек и прочие service-строки в ленте практики. */
export const PRACTICE_FEEDBACK_TYPEWRITER_WORD_MS = 26

/** «Engvo проверяет ответ...» — спокойнее обычной service-строки. */
export const ENGVO_CHECKING_TYPEWRITER_WORD_MS = 50

export function practiceTypewriterSpeedForSection(type: Bubble['type']): number {
  return PRACTICE_TYPEWRITER_WORD_MS_BY_SECTION[type]
}
