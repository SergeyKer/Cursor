import { buildReferenceSheetByLessonId } from '@/lib/reference/buildReferenceSheet'
import type { ReferenceSheet } from '@/lib/reference/types'
import { getStructuredLessonById } from '@/lib/structuredLessons'

/**
 * Sync gate before stash/open: sheet must build and lesson must exist.
 * Prevents P0-1 false `opened` + orphan tutor return stash.
 */
export function resolveLocalReferenceLesson(lessonId: string): ReferenceSheet | null {
  const id = lessonId.trim()
  if (!id) return null
  if (!getStructuredLessonById(id)) return null
  return buildReferenceSheetByLessonId(id)
}

export function canOpenLocalReferenceLesson(lessonId: string): boolean {
  return resolveLocalReferenceLesson(lessonId) != null
}
