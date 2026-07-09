import type { PracticeQuestion, PracticeSession } from '@/types/practice'
import type { LessonData } from '@/types/lesson'
import { getStructuredLessonById } from '@/lib/structuredLessons'

export function resolveLessonFromSession(session: PracticeSession): LessonData | null {
  if (session.source.kind === 'runtime_lesson') return session.source.lesson
  return getStructuredLessonById(session.lessonId)
}

/** Formerly patched speed-round choice tiers; error-fix has no adaptive choice options. */
export function applyAdaptiveChoiceTier(
  _session: PracticeSession,
  _questionIndex: number,
  _lesson: LessonData
): PracticeQuestion | null {
  return null
}

export function normalizeAdaptiveQuestionInSession(session: PracticeSession): PracticeSession {
  return session
}
