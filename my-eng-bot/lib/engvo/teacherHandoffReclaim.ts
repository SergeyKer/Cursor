import type { EngvoTeacherPhase } from '@/lib/engvo/sessionKind'

export const ENGVO_TEACHER_HANDOFF_RECLAIM_MAX_ATTEMPTS = 2

/**
 * Close topic→drill race: after the learner named a topic and first drill is still pending,
 * detect as drill even if the phase ref has not flipped yet.
 */
export function resolveTeacherDetectPhase(params: {
  phase: EngvoTeacherPhase | null
  userFinalCount: number
  awaitingFirstDrill: boolean
}): EngvoTeacherPhase | null {
  if (params.userFinalCount >= 1 && params.awaitingFirstDrill) {
    return 'drill'
  }
  return params.phase
}

/** Whether another handoff reclaim is allowed this user turn. */
export function shouldAllowTeacherHandoffReclaim(params: {
  userFinalCount: number
  awaitingFirstDrill: boolean
  attemptsThisUserTurn: number
  maxAttempts?: number
}): boolean {
  if (params.userFinalCount < 1) return false
  if (!params.awaitingFirstDrill) return false
  const max = params.maxAttempts ?? ENGVO_TEACHER_HANDOFF_RECLAIM_MAX_ATTEMPTS
  return params.attemptsThisUserTurn < max
}

/**
 * Budget for any teacher drill reclaim this user turn:
 * - handoff (awaitingFirstDrill): up to 2 attempts
 * - invite_without_ru after first drill: 1 attempt (attempts === 0)
 */
export function shouldAllowTeacherDrillReclaim(params: {
  userFinalCount: number
  awaitingFirstDrill: boolean
  attemptsThisUserTurn: number
  usedThisUserTurn: boolean
  maxHandoffAttempts?: number
}): boolean {
  if (params.userFinalCount < 1) return false
  if (params.awaitingFirstDrill) {
    return shouldAllowTeacherHandoffReclaim({
      userFinalCount: params.userFinalCount,
      awaitingFirstDrill: true,
      attemptsThisUserTurn: params.attemptsThisUserTurn,
      maxAttempts: params.maxHandoffAttempts,
    })
  }
  return !params.usedThisUserTurn && params.attemptsThisUserTurn < 1
}
