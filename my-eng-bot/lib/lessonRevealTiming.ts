/** Мягкое появление текста в полосе урока (fade). */
export const LESSON_TEXT_FADE_MS = 520

/** Пауза между полосами перед следующим fade. */
export const LESSON_TEXT_SECTION_PAUSE_MS = 180

/** Интервал между появлением карточек интро — совпадает с циклом softText в пузыре урока. */
export const LESSON_SECTION_REVEAL_INTERVAL_MS =
  LESSON_TEXT_FADE_MS + LESSON_TEXT_SECTION_PAUSE_MS

/** Длительность slide-in отдельной карточки интро — совпадает с fade текста. */
export const LESSON_CARD_ENTER_MS = LESSON_TEXT_FADE_MS
