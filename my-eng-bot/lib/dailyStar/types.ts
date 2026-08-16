export const DAILY_STAR_SERIES_TARGET = 7
export const DAILY_STAR_HISTORY_CAP = 400

export type DailyStarClosedBy =
  | 'communication'
  | 'translation'
  | 'dialogue'
  | 'engvo'
  | 'practice'
  | 'lesson'
  | 'legacy'

export type DailyStarHistoryRow = {
  date: string
  closedBy: DailyStarClosedBy
}

export type DailyStarState = {
  lastClosedDate: string | null
  seriesToward7: number
  seriesCollected: boolean
  history: DailyStarHistoryRow[]
  lifetimeStars: number
}

export type DailyStarActivity = {
  closedByToday: DailyStarClosedBy | null
}

export type DailyStarSnapshot = {
  dailyClosedToday: boolean
  dayXOf7: number
  seriesToward7: number
  lastClosedDate: string | null
  seriesCollected: boolean
  rubyAwarded: false
  lifetimeStars: number
  todayClosedBy: DailyStarClosedBy | null
  history: DailyStarHistoryRow[]
}

export type DailyStarStoreSlices = {
  communicationCompletedAt?: string | null
  translationCompletedAt?: string | null
  dialogueCompletedAt?: string | null
  engvoCompletedAt?: string | null
  lessons: Array<{ lessonCompletedAt?: string | null }>
  practiceSessions: Array<{ completedAt: number | null | undefined }>
}

export function createEmptyDailyStarState(): DailyStarState {
  return {
    lastClosedDate: null,
    seriesToward7: 0,
    seriesCollected: false,
    history: [],
    lifetimeStars: 0,
  }
}

export function emptyDailyStarActivity(): DailyStarActivity {
  return { closedByToday: null }
}
