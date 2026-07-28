import type { TutorCuriosityEntry } from '@/lib/tutor/types'
import { asRecord, compactText } from '@/lib/tutor/text'

function isIsoDate(value: string): boolean {
  if (!value) return false
  const t = Date.parse(value)
  return Number.isFinite(t)
}

/**
 * Normalize a curiosity store entry. Curiosity ≠ LearningSignal / errorCount.
 */
export function normalizeTutorCuriosityEntry(input: unknown): TutorCuriosityEntry | null {
  const row = asRecord(input)
  if (!row) return null

  const id = compactText(row.id, 80)
  const topicTitle = compactText(row.topicTitle ?? row.title, 120)
  const questionRu = compactText(row.questionRu ?? row.question, 280)
  const createdAtIso = compactText(row.createdAtIso ?? row.createdAt, 40)
  if (!id || !topicTitle || !questionRu || !isIsoDate(createdAtIso)) return null

  const canonicalKey = compactText(row.canonicalKey, 120) || undefined
  const answeredRaw = compactText(row.answeredAtIso ?? row.answeredAt, 40)
  const answeredAtIso = answeredRaw && isIsoDate(answeredRaw) ? answeredRaw : undefined

  return {
    id,
    topicTitle,
    questionRu,
    createdAtIso,
    ...(canonicalKey ? { canonicalKey } : {}),
    ...(answeredAtIso ? { answeredAtIso } : {}),
  }
}
