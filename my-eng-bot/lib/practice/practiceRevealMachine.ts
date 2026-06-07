export type PracticeRevealPhase = 'typing' | 'pause' | 'done'

export type PracticeRevealState = {
  phase: PracticeRevealPhase
  visibleSectionCount: number
  typingSectionIndex: number | null
  sectionCount: number
  /** Следующий индекс после паузы между полосами. */
  pendingSectionIndex: number | null
}

export function createDoneRevealState(sectionCount: number): PracticeRevealState {
  return {
    phase: 'done',
    visibleSectionCount: sectionCount,
    typingSectionIndex: null,
    sectionCount,
    pendingSectionIndex: null,
  }
}

export function createInitialRevealState(sectionCount: number): PracticeRevealState {
  if (sectionCount <= 0) {
    return createDoneRevealState(0)
  }
  return {
    phase: 'typing',
    visibleSectionCount: 1,
    typingSectionIndex: 0,
    sectionCount,
    pendingSectionIndex: null,
  }
}

export function applySectionTypewriterComplete(
  state: PracticeRevealState,
  sectionIndex: number
): PracticeRevealState {
  if (state.phase === 'done') return state
  if (state.typingSectionIndex !== sectionIndex) return state

  const nextIndex = sectionIndex + 1
  if (nextIndex < state.sectionCount) {
    return {
      ...state,
      phase: 'pause',
      typingSectionIndex: null,
      pendingSectionIndex: nextIndex,
    }
  }

  return createDoneRevealState(state.sectionCount)
}

export function applySectionPauseComplete(state: PracticeRevealState): PracticeRevealState {
  if (state.phase !== 'pause' || state.pendingSectionIndex === null) return state

  return {
    ...state,
    phase: 'typing',
    visibleSectionCount: state.pendingSectionIndex + 1,
    typingSectionIndex: state.pendingSectionIndex,
    pendingSectionIndex: null,
  }
}

export function isPracticeRevealInProgress(state: PracticeRevealState): boolean {
  return state.phase !== 'done'
}
