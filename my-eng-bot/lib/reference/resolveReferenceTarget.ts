import { featureFlags } from '@/lib/featureFlags'
import { canOpenLocalReferenceLesson, resolveLocalReferenceLesson } from '@/lib/reference/canOpenLocalReference'
import { getPrebuiltSheet } from '@/lib/reference/prebuiltStore'
import { getSyllabusTopicByKey } from '@/lib/reference/syllabus/topics'
import type { ReferenceSheet } from '@/lib/reference/types'
import { normalizeFaqText } from '@/lib/tutor/localFaq/normalizeFaq'

export type ResolveReferenceTargetInput = {
  lessonId?: string | null
  topicKey?: string | null
  query?: string | null
  runtimeSheet?: ReferenceSheet | null
}

export type ResolveReferenceTargetResult =
  | { kind: 'runtime'; sheet: ReferenceSheet }
  | { kind: 'lesson'; lessonId: string; sheet: ReferenceSheet }
  | { kind: 'prebuilt'; sheet: ReferenceSheet; topicKey: string }
  | { kind: 'generate'; query: string; topicKey?: string }
  | { kind: 'reject'; reason: string }

/** Single-token / very short queries must not raw-generate. */
export function isShortReferenceQuery(query: string): boolean {
  const norm = normalizeFaqText(query)
  if (!norm) return true
  if (norm.length <= 3) return true
  const parts = norm.split(/\s+/).filter(Boolean)
  return parts.length === 1 && parts[0]!.length <= 12
}

function tryOpenLesson(lessonId: string): ResolveReferenceTargetResult | null {
  const id = lessonId.trim()
  if (!id) return null
  const sheet = resolveLocalReferenceLesson(id)
  if (sheet && canOpenLocalReferenceLesson(id)) {
    return { kind: 'lesson', lessonId: id, sheet }
  }
  return null
}

function tryOpenTopicKey(topicKey: string): ResolveReferenceTargetResult | null {
  const key = topicKey.trim()
  if (!key) return null
  const linked = getSyllabusTopicByKey(key)
  if (linked?.lessonId) {
    const lesson = tryOpenLesson(linked.lessonId)
    if (lesson) return lesson
  }
  const prebuilt = getPrebuiltSheet(key)
  if (prebuilt) {
    return { kind: 'prebuilt', sheet: prebuilt, topicKey: key }
  }
  return null
}

/**
 * Canonical resolve for all reference entry points.
 * Priority: runtime → lesson → topicKey/prebuilt → short-token reject → generate (flag) → reject.
 */
export function resolveReferenceTarget(
  input: ResolveReferenceTargetInput
): ResolveReferenceTargetResult {
  if (input.runtimeSheet) {
    return { kind: 'runtime', sheet: input.runtimeSheet }
  }

  const lessonId = input.lessonId?.trim() || ''
  if (lessonId) {
    const opened = tryOpenLesson(lessonId)
    if (opened) return opened
  }

  const topicKey = input.topicKey?.trim() || ''
  if (topicKey) {
    const opened = tryOpenTopicKey(topicKey)
    if (opened) return opened
  }

  const query = (input.query || topicKey || '').trim()
  if (!query) {
    return { kind: 'reject', reason: 'empty' }
  }

  if (isShortReferenceQuery(query)) {
    return { kind: 'reject', reason: 'short_token' }
  }

  if (!featureFlags.referenceGenerate) {
    return { kind: 'reject', reason: 'generate_disabled' }
  }

  return { kind: 'generate', query, topicKey: topicKey || undefined }
}
