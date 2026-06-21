export const LESSON_BRIEFING_PREPARE_LABEL_START = 'Готовим...'
export const LESSON_BRIEFING_PREPARE_LABEL_FETCH = 'Получаем...'
export const LESSON_BRIEFING_PREPARE_LABEL_LAUNCH = 'Запускаю...'

/** Самая длинная фазовая подпись - для ghost-span на dual CTA. */
export const LESSON_BRIEFING_PREPARE_GHOST_LABEL = LESSON_BRIEFING_PREPARE_LABEL_FETCH

export const LESSON_BRIEFING_PREPARE_LABEL_BY_THRESHOLD = [
  { minProgress: 0, label: LESSON_BRIEFING_PREPARE_LABEL_START },
  { minProgress: 33, label: LESSON_BRIEFING_PREPARE_LABEL_FETCH },
  { minProgress: 80, label: LESSON_BRIEFING_PREPARE_LABEL_LAUNCH },
] as const
