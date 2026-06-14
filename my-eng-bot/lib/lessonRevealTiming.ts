/** Мягкое появление текста в полосе урока (fade). */
export const LESSON_TEXT_FADE_MS = 520

/** Пауза между полосами перед следующим fade. */
export const LESSON_TEXT_SECTION_PAUSE_MS = 180

/** Пауза после theory перед fade текста в task-shell (не путать с LESSON_SUCCESS_HOLD_MS между шагами). */
export const LESSON_TASK_PROMPT_PAUSE_MS = 500

/** Пауза перед следующей секцией softText-reveal. */
export function resolveLessonSectionRevealPauseMs(params: {
  completedSectionIndex: number
  extraPauseBeforeIndex?: number
  extraPauseMs?: number
}): number {
  const { completedSectionIndex, extraPauseBeforeIndex, extraPauseMs = LESSON_TASK_PROMPT_PAUSE_MS } =
    params
  if (
    extraPauseBeforeIndex != null &&
    extraPauseBeforeIndex > 0 &&
    completedSectionIndex === extraPauseBeforeIndex - 1
  ) {
    return extraPauseMs
  }
  return LESSON_TEXT_SECTION_PAUSE_MS
}

/** Интервал между появлением карточек интро — совпадает с циклом softText в пузыре урока. */
export const LESSON_SECTION_REVEAL_INTERVAL_MS =
  LESSON_TEXT_FADE_MS + LESSON_TEXT_SECTION_PAUSE_MS

/** Длительность slide-in отдельной карточки интро — совпадает с fade текста. */
export const LESSON_CARD_ENTER_MS = LESSON_TEXT_FADE_MS
