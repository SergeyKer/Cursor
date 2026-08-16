export const DAILY_STAR_SERIES_TARGET = 7
export const DAILY_STAR_TUTOR_FAQ_MIN = 3

export type DailyStarState = {
  lastClosedDate: string | null
  seriesToward7: number
  seriesCollected: boolean
}

export type DailyStarActivity = {
  lessonCount: number
  practiceCount: number
  vocabCount: number
  pronunciationCount: number
  tutorFaqCount: number
}

export type DailyStarSnapshot = {
  dailyClosedToday: boolean
  dayXOf7: number
  seriesToward7: number
  lastClosedDate: string | null
  seriesCollected: boolean
  rubyAwarded: false
}

export type DailyStarStoreSlices = {
  lessons: Array<{ lastCompleted: string }>
  practiceSessions: Array<{ completedAt: number | null | undefined }>
  vocabHistory: Array<{ completedAt: number }>
  accent: Array<{ completedDates: string[] }>
  tutorFaqShown: Array<{ at: number }>
}

export function createEmptyDailyStarState(): DailyStarState {
  return {
    lastClosedDate: null,
    seriesToward7: 0,
    seriesCollected: false,
  }
}

export function emptyDailyStarActivity(): DailyStarActivity {
  return {
    lessonCount: 0,
    practiceCount: 0,
    vocabCount: 0,
    pronunciationCount: 0,
    tutorFaqCount: 0,
  }
}
