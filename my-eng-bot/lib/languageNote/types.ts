export type LanguageNoteStatus = 'needs_fix' | 'already_good' | 'needs_better'

export type LanguageNoteCorrectTarget = 'en' | 'ru'

export type LanguageNoteReviewTopic = {
  id: string
  title: string
}

export type LanguageNote = {
  status: LanguageNoteStatus
  original: string
  correct: string
  correctHighlights: string[]
  correctReasons: string[]
  better: string | null
  betterHighlights: string[]
  betterReasons: string[]
  betterAlternatives: string[]
  reviewTopics: LanguageNoteReviewTopic[]
  lessonId: string | null
  lessonTitle: string | null
  /** Режим общения, с которым собрана подсказка (для кэша). */
  voiceMode?: 'ru' | 'en' | 'mix' | null
  /** Язык блока «Правильно». */
  correctTarget?: LanguageNoteCorrectTarget
  /** Teacher Say/Скажи: correct locked to etalon; sheet title «Эталон». */
  teacherEtalon?: boolean
}

export type LanguageNoteMode = 'communication' | 'engvo'

export const LANGUAGE_NOTE_MAX_INPUT_CHARS = 500
export const LANGUAGE_NOTE_MAX_REASONS = 3
export const LANGUAGE_NOTE_MAX_REASON_CHARS = 140
export const LANGUAGE_NOTE_MAX_ALTERNATIVES = 1
export const LANGUAGE_NOTE_MAX_TOPICS = 3
export const LANGUAGE_NOTE_MAX_TOPIC_TITLE_CHARS = 56
export const LANGUAGE_NOTE_MAX_ALTERNATIVE_CHARS = 70
export const LANGUAGE_NOTE_MAX_BETTER_REASONS = 1
