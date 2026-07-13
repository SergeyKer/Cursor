import type { QuickTestProgressState, QuickTestResumeState } from '@/lib/quickTest/types'

export const PROGRESS_STORAGE_KEY = 'myeng:quick-test:v1'
export const RESUME_STORAGE_KEY = 'myeng:quick-test-resume:v1'

function safeLocal(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function safeSession(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function readProgress(): QuickTestProgressState {
  const storage = safeLocal()
  if (!storage) return { byLessonId: {} }
  try {
    const raw = storage.getItem(PROGRESS_STORAGE_KEY)
    if (!raw) return { byLessonId: {} }
    const parsed = JSON.parse(raw) as QuickTestProgressState
    if (!parsed?.byLessonId || typeof parsed.byLessonId !== 'object') return { byLessonId: {} }
    return parsed
  } catch {
    return { byLessonId: {} }
  }
}

export function writeProgress(state: QuickTestProgressState): void {
  const storage = safeLocal()
  if (!storage) return
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

export function readResume(): QuickTestResumeState | null {
  const storage = safeSession()
  if (!storage) return null
  try {
    const raw = storage.getItem(RESUME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as QuickTestResumeState
    if (!parsed?.slug || !parsed?.variantId || typeof parsed.currentIndex !== 'number') return null
    if (!Array.isArray(parsed.answers)) return null
    return parsed
  } catch {
    return null
  }
}

export function writeResume(state: QuickTestResumeState): void {
  const storage = safeSession()
  if (!storage) return
  try {
    storage.setItem(RESUME_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function clearResume(): void {
  safeSession()?.removeItem(RESUME_STORAGE_KEY)
}
