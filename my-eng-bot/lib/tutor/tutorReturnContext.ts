import { storageGet, storageRemove, storageSet } from '@/lib/tutor/storageAdapter'

const STORAGE_KEY = 'engvo.tutorReturnContext:v1'
const TTL_MS = 60 * 60 * 1000

export type TutorReturnContextSnapshot = {
  savedAt: number
  draft: string
  anchorQuery: string | null
  followUpMode: boolean
  postExplainChips: boolean
  /** Serialized thread messages. */
  thread: Array<{ id: string; role: 'user' | 'assistant'; text: string }>
  /** Last explain topic for cheatsheet restore. */
  lastExplainCanonicalKey?: string | null
}

function safeParse(raw: string | null): TutorReturnContextSnapshot | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as TutorReturnContextSnapshot
    if (!data || typeof data !== 'object') return null
    if (typeof data.savedAt !== 'number' || !Array.isArray(data.thread)) return null
    if (Date.now() - data.savedAt > TTL_MS) return null
    return data
  } catch {
    return null
  }
}

/** Persist tutor session before leaving to reference/lesson/practice. */
export function stashTutorReturnContext(snapshot: Omit<TutorReturnContextSnapshot, 'savedAt'>): void {
  const payload: TutorReturnContextSnapshot = { ...snapshot, savedAt: Date.now() }
  storageSet('session', STORAGE_KEY, JSON.stringify(payload))
}

export function peekTutorReturnContext(): TutorReturnContextSnapshot | null {
  return safeParse(storageGet('session', STORAGE_KEY))
}

export function consumeTutorReturnContext(): TutorReturnContextSnapshot | null {
  const parsed = safeParse(storageGet('session', STORAGE_KEY))
  storageRemove('session', STORAGE_KEY)
  return parsed
}

export function clearTutorReturnContext(): void {
  storageRemove('session', STORAGE_KEY)
}
