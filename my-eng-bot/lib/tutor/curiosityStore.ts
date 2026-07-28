import { normalizeTutorCuriosityEntry } from '@/lib/tutor/normalizeCuriosity'
import { storageGet, storageRemove, storageSet } from '@/lib/tutor/storageAdapter'
import type { TutorCuriosityEntry } from '@/lib/tutor/types'
import { compactText } from '@/lib/tutor/text'

const STORAGE_KEY = 'engvo.tutorCuriosity:v1'
const MAX_ENTRIES = 20

function readAll(): TutorCuriosityEntry[] {
  try {
    const raw = storageGet('local', STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizeTutorCuriosityEntry(item))
      .filter((item): item is TutorCuriosityEntry => item != null)
      .slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

function writeAll(entries: TutorCuriosityEntry[]): void {
  storageSet('local', STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
}

/** Curiosity write after successful Explain. Not an error signal. */
export function recordTutorCuriosity(input: {
  topicTitle: string
  questionRu: string
  canonicalKey?: string
}): TutorCuriosityEntry | null {
  const topicTitle = compactText(input.topicTitle, 120)
  const questionRu = compactText(input.questionRu, 280)
  if (!topicTitle || !questionRu) return null

  const entry = normalizeTutorCuriosityEntry({
    id: `cur_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    topicTitle,
    questionRu,
    canonicalKey: input.canonicalKey,
    createdAtIso: new Date().toISOString(),
  })
  if (!entry) return null

  const prev = readAll().filter(
    (item) =>
      item.canonicalKey !== entry.canonicalKey ||
      item.questionRu.toLowerCase() !== entry.questionRu.toLowerCase()
  )
  writeAll([entry, ...prev])
  return entry
}

export function listTutorCuriosity(limit = 10): TutorCuriosityEntry[] {
  return readAll().slice(0, Math.max(0, limit))
}

export function clearTutorCuriosityForTests(): void {
  storageRemove('local', STORAGE_KEY)
}
