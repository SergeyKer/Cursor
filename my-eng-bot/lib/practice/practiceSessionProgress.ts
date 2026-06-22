import { getPracticeModePlan } from '@/lib/practice/engine/sessionPlan'
import type { PracticeSession } from '@/types/practice'

export function resolvePracticeTargetQuestionCount(session: PracticeSession): number {
  return session.targetQuestionCount ?? getPracticeModePlan(session.mode).length
}

export function isPracticeAwaitingAiGeneration(session: PracticeSession): boolean {
  const target = resolvePracticeTargetQuestionCount(session)
  return (
    session.generationSource === 'ai_generated' &&
    session.currentIndex >= session.questions.length - 1 &&
    session.questions.length < target
  )
}

export function normalizePracticeSessionTargetCount(session: PracticeSession): PracticeSession {
  if (session.generationSource !== 'ai_generated' || session.targetQuestionCount != null) {
    return session
  }
  return {
    ...session,
    targetQuestionCount: getPracticeModePlan(session.mode).length,
  }
}
