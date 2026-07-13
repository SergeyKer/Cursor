import type { QuickTestEntryContext, QuickTestOpenLessonIntent } from '@/lib/quickTest/types'

export const OPEN_LESSON_INTENT_KEY = 'myeng:quick-test-open-lesson:v1'
export const ENTRY_CONTEXT_KEY = 'myeng:quick-test-entry-context:v1'
export const INTENT_TTL_MS = 10 * 60 * 1000

function safeGetSession(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function writeEntryContext(ctx: QuickTestEntryContext): void {
  const storage = safeGetSession()
  if (!storage) return
  storage.setItem(ENTRY_CONTEXT_KEY, JSON.stringify(ctx))
}

export function readEntryContext(): QuickTestEntryContext | null {
  const storage = safeGetSession()
  if (!storage) return null
  try {
    const raw = storage.getItem(ENTRY_CONTEXT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as QuickTestEntryContext
    if (parsed?.source !== 'internal_menu') return null
    if (parsed.audience !== 'child' && parsed.audience !== 'adult') return null
    return parsed
  } catch {
    return null
  }
}

export function clearEntryContext(): void {
  safeGetSession()?.removeItem(ENTRY_CONTEXT_KEY)
}

export function writeOpenLessonIntent(intent: QuickTestOpenLessonIntent): void {
  const storage = safeGetSession()
  if (!storage) return
  storage.setItem(OPEN_LESSON_INTENT_KEY, JSON.stringify(intent))
}

export function peekOpenLessonIntent(now = Date.now()): QuickTestOpenLessonIntent | null {
  const storage = safeGetSession()
  if (!storage) return null
  try {
    const raw = storage.getItem(OPEN_LESSON_INTENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as QuickTestOpenLessonIntent
    if (!parsed?.lessonId || typeof parsed.createdAt !== 'number') {
      storage.removeItem(OPEN_LESSON_INTENT_KEY)
      return null
    }
    if (now - parsed.createdAt > INTENT_TTL_MS) {
      storage.removeItem(OPEN_LESSON_INTENT_KEY)
      return null
    }
    return parsed
  } catch {
    storage.removeItem(OPEN_LESSON_INTENT_KEY)
    return null
  }
}

/** One-shot: read and clear. */
export function consumeOpenLessonIntent(now = Date.now()): QuickTestOpenLessonIntent | null {
  const intent = peekOpenLessonIntent(now)
  if (!intent) return null
  safeGetSession()?.removeItem(OPEN_LESSON_INTENT_KEY)
  return intent
}

export function clearOpenLessonIntent(): void {
  safeGetSession()?.removeItem(OPEN_LESSON_INTENT_KEY)
}

export function buildOpenLessonFallbackUrl(lessonId: string): string {
  return `/?openLesson=${encodeURIComponent(lessonId)}`
}
