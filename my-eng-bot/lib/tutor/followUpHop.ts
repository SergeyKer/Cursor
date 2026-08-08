/**
 * Post-explain follow-up chip hops.
 * 0 = off, 1 = thematic (or exit fallback), 2 = «Напиши ещё примеры».
 * Pure: no React.
 */

export type FollowUpHop = 0 | 1 | 2

export type FollowUpHopEvent =
  | { type: 'newExplain' }
  | { type: 'tapFollowUp'; hop1WasExit: boolean }
  | { type: 'continueExplainOk' }
  | { type: 'continueExplainFail' }
  | { type: 'userTypedOwn' }

/** After thematic hop1 tap: wait for continue explain before showing hop2. */
export type FollowUpAwaitingHop2 = boolean

export type FollowUpHopState = {
  hop: FollowUpHop
  awaitingHop2: FollowUpAwaitingHop2
}

export function initialFollowUpHopState(): FollowUpHopState {
  return { hop: 0, awaitingHop2: false }
}

/**
 * Pure reducer for follow-up chip phase.
 */
export function nextFollowUpHopState(
  state: FollowUpHopState,
  event: FollowUpHopEvent
): FollowUpHopState {
  switch (event.type) {
    case 'newExplain':
      return { hop: 1, awaitingHop2: false }
    case 'tapFollowUp': {
      if (state.hop === 2) {
        return { hop: 0, awaitingHop2: false }
      }
      if (state.hop === 1) {
        if (event.hop1WasExit) {
          return { hop: 0, awaitingHop2: false }
        }
        return { hop: 0, awaitingHop2: true }
      }
      return { hop: 0, awaitingHop2: false }
    }
    case 'continueExplainOk':
      if (state.awaitingHop2) {
        return { hop: 2, awaitingHop2: false }
      }
      return state
    case 'continueExplainFail':
      return { hop: 0, awaitingHop2: false }
    case 'userTypedOwn':
      return { hop: 0, awaitingHop2: false }
    default:
      return state
  }
}

/** Visible chip hop: 0 while awaitingHop2 (busy gap). */
export function visibleFollowUpHop(state: FollowUpHopState): FollowUpHop {
  if (state.awaitingHop2) return 0
  return state.hop
}

/**
 * Restore hop from return-context fields.
 * Prefer explicit followUpHop; else legacy armed/consumed.
 */
export function resolveFollowUpHopFromSnapshot(params: {
  followUpHop?: number | null
  followUpNudgeConsumed?: boolean
  followUpNudgeArmed?: boolean
}): FollowUpHopState {
  const raw = params.followUpHop
  if (raw === 0 || raw === 1 || raw === 2) {
    return { hop: raw, awaitingHop2: false }
  }
  if (params.followUpNudgeConsumed === true) {
    return { hop: 0, awaitingHop2: false }
  }
  if (params.followUpNudgeArmed === true) {
    return { hop: 1, awaitingHop2: false }
  }
  return initialFollowUpHopState()
}

/** Legacy booleans for older readers of the snapshot. */
export function followUpLegacyFlags(state: FollowUpHopState): {
  followUpNudgeArmed: boolean
  followUpNudgeConsumed: boolean
} {
  const visible = visibleFollowUpHop(state)
  if (visible === 0 && !state.awaitingHop2) {
    return { followUpNudgeArmed: false, followUpNudgeConsumed: true }
  }
  if (state.awaitingHop2) {
    return { followUpNudgeArmed: true, followUpNudgeConsumed: true }
  }
  return { followUpNudgeArmed: true, followUpNudgeConsumed: false }
}
