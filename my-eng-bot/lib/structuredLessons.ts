import type { LessonData } from '@/types/lesson'
import { embeddedQuestionsLesson } from '@/lib/lessons/embedded-questions'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { whoLikesLesson } from '@/lib/lessons/who-likes'

const STRUCTURED_LESSONS: Record<string, LessonData> = {
  '1': itsTimeToLesson,
  '2': whoLikesLesson,
  '3': embeddedQuestionsLesson,
}

export function getAllStructuredLessons(): LessonData[] {
  return Object.values(STRUCTURED_LESSONS)
}

export function getStructuredLessonById(lessonId: string): LessonData | null {
  return STRUCTURED_LESSONS[lessonId] ?? null
}
