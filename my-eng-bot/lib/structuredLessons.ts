import type { LessonData } from '@/types/lesson'
import { getCachedLessonById, loadLessonById, primeLessonCache } from '@/lib/lessons/loadLessonById'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { whoLikesLesson } from '@/lib/lessons/who-likes'
import { embeddedQuestionsLesson } from '@/lib/lessons/embedded-questions'
import { introducingYourselfLesson } from '@/lib/lessons/introducing-yourself'

/** Sync map for API/tests; runtime may override lesson 1 via JSON through {@link loadLessonById}. */
const SYNC_STRUCTURED_LESSONS: Record<string, LessonData> = {
  '1': itsTimeToLesson,
  '2': whoLikesLesson,
  '3': embeddedQuestionsLesson,
  '4': introducingYourselfLesson,
}

primeLessonCache('1', itsTimeToLesson)

export function getAllStructuredLessons(): LessonData[] {
  return Object.values(SYNC_STRUCTURED_LESSONS).map((lesson) => getCachedLessonById(lesson.id) ?? lesson)
}

export function getStructuredLessonById(lessonId: string): LessonData | null {
  return getCachedLessonById(lessonId) ?? SYNC_STRUCTURED_LESSONS[lessonId] ?? null
}

export { loadLessonById } from '@/lib/lessons/loadLessonById'
