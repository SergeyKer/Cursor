/** Мягкое появление текста в полосе урока (fade). */
export const LESSON_TEXT_FADE_MS = 520

/** Пауза между полосами перед следующим fade. */
export const LESSON_TEXT_SECTION_PAUSE_MS = 180

/** Пауза после theory перед fade текста в task-shell (не путать с LESSON_SUCCESS_HOLD_MS между шагами). */
export const LESSON_TASK_PROMPT_PAUSE_MS = LESSON_TEXT_SECTION_PAUSE_MS

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

/** Интервал между появлением карточек интро - совпадает с циклом softText в пузыре урока. */
export const LESSON_SECTION_REVEAL_INTERVAL_MS =
  LESSON_TEXT_FADE_MS + LESSON_TEXT_SECTION_PAUSE_MS

/** Длительность slide-in отдельной карточки интро - совпадает с fade текста. */
export const LESSON_CARD_ENTER_MS = LESSON_TEXT_FADE_MS

/** Длительность .lesson-enter (lessonSlideIn) — синхрон с globals.css. */
export const LESSON_BUBBLE_ENTER_MS = 420

/** Пауза после пузыря briefing перед fade карточки composer. */
export const LESSON_BRIEFING_CARD_PAUSE_MS = LESSON_TEXT_SECTION_PAUSE_MS

/** Пауза после fade карточки briefing перед разморозкой CTA. */
export const LESSON_BRIEFING_ACTIONS_PAUSE_MS = LESSON_TEXT_SECTION_PAUSE_MS

/** Fallback: полная цепочка bubble → pause → card fade → pause → CTA. */
export const LESSON_BRIEFING_COMPOSER_REVEAL_MS =
  LESSON_BUBBLE_ENTER_MS +
  LESSON_BRIEFING_CARD_PAUSE_MS +
  LESSON_TEXT_FADE_MS +
  LESSON_BRIEFING_ACTIONS_PAUSE_MS
