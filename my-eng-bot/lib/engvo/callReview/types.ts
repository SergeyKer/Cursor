import type { LanguageNote, LanguageNoteReviewTopic } from '@/lib/languageNote/types'

export type CallReviewKind = 'free_call' | 'teacher'

/** One error card in the post-call review sheet. */
export type CallReviewCard = {
  id: string
  utteranceHash: string
  original: string
  correct: string
  /** Free only; max 1 shown. */
  reason: string | null
  /** Free only; shown when differs from correct. */
  better: string | null
  teacherEtalon: boolean
  reviewTopics: LanguageNoteReviewTopic[]
  lessonId: string | null
  /** Full note when from silent assess — for chip generate payload. */
  sourceNote: LanguageNote | null
}

export type CallReviewTopicEntry = {
  topic: LanguageNoteReviewTopic
  /** First card that contributed this topic (for chip handler). */
  representativeNote: LanguageNote
}

export type CallReviewSession = {
  kind: CallReviewKind
  cards: CallReviewCard[]
  topics: CallReviewTopicEntry[]
  summaryLine: string
}

/** Raw buffer item before build. */
export type CallReviewBufferItem = {
  utteranceHash: string
  original: string
  correct: string
  reason?: string | null
  better?: string | null
  teacherEtalon?: boolean
  reviewTopics?: LanguageNoteReviewTopic[]
  lessonId?: string | null
  sourceNote?: LanguageNote | null
  /** Monotonic order within the call (higher = later). */
  seq: number
}

export const CALL_REVIEW_MAX_CARDS = 5
export const CALL_REVIEW_MAX_TOPICS = 3
