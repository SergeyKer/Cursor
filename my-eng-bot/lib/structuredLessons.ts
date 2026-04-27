import type { LessonData } from '@/types/lesson'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { whoLikesLesson } from '@/lib/lessons/who-likes'

const STRUCTURED_LESSONS: Record<string, LessonData> = {
  '1': itsTimeToLesson,
  '2': whoLikesLesson,
}

export function getStructuredLessonById(lessonId: string): LessonData | null {
  return STRUCTURED_LESSONS[lessonId] ?? null
}
