import {
  PRACTICE_COIN_ERROR_FORGIVENESS_COST,
  PRACTICE_RING_MAX,
  isPracticeForgivenessStep,
} from '@/lib/practice/practiceEconomyRules'
import { computePracticeMasterySnapshot } from '@/lib/practice/practiceMastery'
import { awardCoins, spendCoins, type RewardsState } from '@/lib/rewardsState'
import type { PracticeSession } from '@/types/practice'

export type PracticeForgivenessFlowState =
  | 'idle'
  | 'briefing'
  | 'active'
  | 'submitting'
  | 'checking'
  | 'feedback'
  | 'correction'
  | 'generating_next'
  | 'completed'
  | 'error'

export type PracticeForgivenessBubbleMode = 'active' | 'frozen' | 'exhausted'

function firstTryMissCount(session: PracticeSession): number {
  let misses = 0
  for (const question of session.questions) {
    const first = session.answers.find((answer) => answer.questionId === question.id)
    if (first && (!first.isCorrect || first.corrected)) misses += 1
  }
  return misses
}

export function resolvePracticeForgivenessBubbleMode(params: {
  session: PracticeSession
  state: PracticeForgivenessFlowState
  tier: 0 | 1 | 2
  ringCount: number
  lastQualifyingDayKey?: string | null
  todayKey: string
}): PracticeForgivenessBubbleMode | null {
  const { session } = params
  if (session.mode !== 'challenge' || params.tier === 0) return null
  if (params.ringCount >= PRACTICE_RING_MAX) return null
  if (params.lastQualifyingDayKey === params.todayKey) return null

  const step = session.currentIndex + 1
  if (!isPracticeForgivenessStep(step)) return null

  const mastery = computePracticeMasterySnapshot(session)
  const misses = firstTryMissCount(session)
  const bestRawMastery = mastery.plannedLength - misses
  if (bestRawMastery !== 10) return null

  const currentQuestionId = session.questions[session.currentIndex]?.id
  const hasCurrentMasteryError = session.answers.some(
    (answer) => answer.questionId === currentQuestionId && !answer.isCorrect && !answer.corrected
  )
  const rescueAtStepFive = step === 5 && misses === 2
  const isErrorSurface =
    (hasCurrentMasteryError &&
      (params.state === 'correction' || params.state === 'feedback')) ||
    (rescueAtStepFive && params.state === 'active')
  if (!isErrorSurface) return null

  if (session.forgivenessUsedThisRun) return 'exhausted'
  if (session.forgivenessConfirmPending || session.forgivenessAppliedAckActive) return 'frozen'
  return 'active'
}

export function requestPracticeForgiveness(
  session: PracticeSession
): { ok: boolean; session: PracticeSession } {
  if (session.forgivenessUsedThisRun || session.forgivenessConfirmPending) {
    return { ok: false, session }
  }
  return {
    ok: true,
    session: { ...session, forgivenessConfirmPending: true },
  }
}

export function applyPracticeForgivenessToSession(
  session: PracticeSession
): { ok: boolean; session: PracticeSession } {
  if (
    session.mode !== 'challenge' ||
    session.forgivenessUsedThisRun ||
    !session.forgivenessConfirmPending
  ) {
    return { ok: false, session }
  }
  const questionId = session.questions[session.currentIndex]?.id
  if (!questionId) return { ok: false, session }
  return {
    ok: true,
    session: {
      ...session,
      forgivenessUsedThisRun: true,
      forgivenessConfirmPending: false,
      forgivenessAppliedAckActive: true,
      forgivenessEffectiveBonus: 1,
      forgivenessQuestionId: questionId,
    },
  }
}

export function spendAndApplyPracticeForgiveness(params: {
  rewardsState: RewardsState
  apply: () => boolean
}): {
  ok: boolean
  rolledBack: boolean
  state: RewardsState
} {
  const spent = spendCoins(params.rewardsState, PRACTICE_COIN_ERROR_FORGIVENESS_COST)
  if (!spent.ok) return { ok: false, rolledBack: false, state: params.rewardsState }
  if (params.apply()) return { ok: true, rolledBack: false, state: spent.state }
  const rollback = awardCoins(spent.state, PRACTICE_COIN_ERROR_FORGIVENESS_COST)
  return {
    ok: false,
    rolledBack: rollback.ok,
    state: rollback.ok ? rollback.state : spent.state,
  }
}
