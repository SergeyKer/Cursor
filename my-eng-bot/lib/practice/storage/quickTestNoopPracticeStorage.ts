import type { PracticeSession } from '@/types/practice'
import type { PracticeStorage } from '@/lib/practice/storage/practiceStorage'

/** Isolates /test from practice localStorage active/completed sessions. */
export function createQuickTestNoopPracticeStorage(): PracticeStorage {
  let memory: PracticeSession | null = null

  return {
    loadActiveSession() {
      return null
    },
    saveActiveSession(session) {
      memory = session
    },
    clearActiveSession() {
      memory = null
    },
    saveCompletedSession() {
      // no-op — quick test progress lives in lib/quickTest/storage
    },
    listCompletedSessions() {
      return []
    },
  }
}
