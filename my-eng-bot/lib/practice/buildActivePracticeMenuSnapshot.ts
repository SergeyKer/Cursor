import type { ActivePracticeMenuSnapshot, PracticeSession } from '@/types/practice'

export function buildActivePracticeMenuSnapshot(
  session: PracticeSession | null | undefined
): ActivePracticeMenuSnapshot | null {
  if (!session || session.status !== 'active') return null

  return {
    lessonId: session.lessonId,
    mode: session.mode,
    referenceExerciseType:
      session.mode === 'reference' ? session.questions[0]?.type : undefined,
  }
}
