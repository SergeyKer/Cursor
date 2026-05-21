import type { PracticeSession } from '@/types/practice'

export function buildContentFingerprint(session: Pick<PracticeSession, 'lessonId' | 'mode' | 'questions'>): string {
  const ids = session.questions.map((q) => q.id).sort().join(',')
  return `${session.lessonId}|${session.mode}|${ids}`
}
