import type { PracticeSession } from '@/types/practice'

const PRACTICE_STORAGE_VERSION = 1
const ACTIVE_SESSION_KEY = 'my-eng-bot-practice-active'
const COMPLETED_SESSIONS_KEY = 'my-eng-bot-practice-completed'

export interface StoredPracticePayload {
  version: number
  session: PracticeSession
}

export interface PracticeStorage {
  loadActiveSession(): PracticeSession | null
  saveActiveSession(session: PracticeSession): void
  clearActiveSession(): void
  saveCompletedSession(session: PracticeSession): void
  listCompletedSessions(): PracticeSession[]
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isSession(value: unknown): value is PracticeSession {
  return Boolean(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string')
}

function readPayload(key: string): StoredPracticePayload | null {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPracticePayload>
    if (parsed.version !== PRACTICE_STORAGE_VERSION || !isSession(parsed.session)) return null
    return parsed as StoredPracticePayload
  } catch {
    return null
  }
}

function writePayload(key: string, session: PracticeSession): void {
  if (!canUseStorage()) return
  try {
    const payload: StoredPracticePayload = { version: PRACTICE_STORAGE_VERSION, session }
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // Storage failures should not break practice flow.
  }
}

export class LocalPracticeStorage implements PracticeStorage {
  loadActiveSession(): PracticeSession | null {
    return readPayload(ACTIVE_SESSION_KEY)?.session ?? null
  }

  saveActiveSession(session: PracticeSession): void {
    writePayload(ACTIVE_SESSION_KEY, session)
  }

  clearActiveSession(): void {
    if (!canUseStorage()) return
    try {
      window.localStorage.removeItem(ACTIVE_SESSION_KEY)
    } catch {
      // ignore
    }
  }

  saveCompletedSession(session: PracticeSession): void {
    if (!canUseStorage()) return
    try {
      const current = this.listCompletedSessions()
      const next = [session, ...current.filter((item) => item.id !== session.id)].slice(0, 50)
      window.localStorage.setItem(COMPLETED_SESSIONS_KEY, JSON.stringify({ version: PRACTICE_STORAGE_VERSION, sessions: next }))
    } catch {
      // ignore
    }
  }

  listCompletedSessions(): PracticeSession[] {
    if (!canUseStorage()) return []
    try {
      const raw = window.localStorage.getItem(COMPLETED_SESSIONS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as { version?: number; sessions?: unknown }
      if (parsed.version !== PRACTICE_STORAGE_VERSION || !Array.isArray(parsed.sessions)) return []
      return parsed.sessions.filter(isSession)
    } catch {
      return []
    }
  }
}

export const practiceStorage = new LocalPracticeStorage()
