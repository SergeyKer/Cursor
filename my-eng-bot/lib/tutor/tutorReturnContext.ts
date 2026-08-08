import type { TutorExplainAnswer } from '@/lib/tutor/types'
import { storageGet, storageRemove, storageSet } from '@/lib/tutor/storageAdapter'

const STORAGE_KEY = 'engvo.tutorReturnContext:v2'
const TTL_MS = 60 * 60 * 1000

export type TutorReturnContextSnapshot = {
  savedAt: number
  draft: string
  anchorQuery: string | null
  postExplainChips: boolean
  /** Serialized thread messages. */
  thread: Array<{ id: string; role: 'user' | 'assistant'; text: string }>
  /** Full last explain for restore after cheatsheet/reference. */
  lastExplain?: TutorExplainAnswer | null
  /** Legacy field; ignored if present. */
  lastExplainCanonicalKey?: string | null
  /** After menu→space promote: run triage once on mount. */
  pendingTriageQuery?: string | null
  /** First-hop follow-up chip already used or superseded by a user turn. */
  followUpNudgeConsumed?: boolean
  /** True after first successful in-scope Explain (not gate/D/OOS). */
  followUpNudgeArmed?: boolean
  /** 0 off | 1 thematic | 2 examples. Preferred over legacy armed/consumed. */
  followUpHop?: 0 | 1 | 2
}

function isExplainLike(value: unknown): value is TutorExplainAnswer {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.title === 'string' && typeof row.answerKind === 'string' && Array.isArray(row.paragraphs)
}

function safeParse(raw: string | null): TutorReturnContextSnapshot | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as TutorReturnContextSnapshot & { followUpMode?: boolean }
    if (!data || typeof data !== 'object') return null
    if (typeof data.savedAt !== 'number' || !Array.isArray(data.thread)) return null
    if (Date.now() - data.savedAt > TTL_MS) return null
    const pending =
      typeof data.pendingTriageQuery === 'string' && data.pendingTriageQuery.trim()
        ? data.pendingTriageQuery.trim()
        : data.pendingTriageQuery === null
          ? null
          : undefined
    const lastExplain = isExplainLike(data.lastExplain) ? data.lastExplain : null
    const hopRaw = data.followUpHop
    const followUpHop: 0 | 1 | 2 | undefined =
      hopRaw === 0 || hopRaw === 1 || hopRaw === 2 ? hopRaw : undefined
    return {
      savedAt: data.savedAt,
      draft: typeof data.draft === 'string' ? data.draft : '',
      anchorQuery: typeof data.anchorQuery === 'string' || data.anchorQuery === null ? data.anchorQuery : null,
      postExplainChips: Boolean(data.postExplainChips),
      thread: data.thread,
      lastExplain,
      ...(pending !== undefined ? { pendingTriageQuery: pending } : {}),
      followUpNudgeConsumed: data.followUpNudgeConsumed === true,
      followUpNudgeArmed: data.followUpNudgeArmed === true,
      ...(followUpHop !== undefined ? { followUpHop } : {}),
    }
  } catch {
    return null
  }
}

/** Persist tutor session before leaving to reference/lesson/practice/space promote. */
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
