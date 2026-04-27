import type { LessonData } from '@/types/lesson'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'

const STRUCTURED_LESSONS: Record<string, LessonData> = {
  '1': itsTimeToLesson,
}

export function getStructuredLessonById(lessonId: string): LessonData | null {
  return STRUCTURED_LESSONS[lessonId] ?? null
}
