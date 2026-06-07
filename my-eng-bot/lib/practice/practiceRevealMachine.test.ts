import { describe, expect, it } from 'vitest'
import {
  applySectionPauseComplete,
  applySectionTypewriterComplete,
  createInitialRevealState,
  isPracticeRevealInProgress,
} from '@/lib/practice/practiceRevealMachine'

describe('practiceRevealMachine', () => {
  it('starts with first section typing', () => {
    const state = createInitialRevealState(3)
    expect(state.phase).toBe('typing')
    expect(state.visibleSectionCount).toBe(1)
    expect(state.typingSectionIndex).toBe(0)
    expect(isPracticeRevealInProgress(state)).toBe(true)
  })

  it('moves to pause after section complete, then to next section after pause', () => {
    const initial = createInitialRevealState(3)
    const paused = applySectionTypewriterComplete(initial, 0)
    expect(paused.phase).toBe('pause')
    expect(paused.visibleSectionCount).toBe(1)
    expect(paused.typingSectionIndex).toBe(null)
    expect(paused.pendingSectionIndex).toBe(1)

    const next = applySectionPauseComplete(paused)
    expect(next.phase).toBe('typing')
    expect(next.visibleSectionCount).toBe(2)
    expect(next.typingSectionIndex).toBe(1)
  })

  it('finishes after last section complete', () => {
    let state = createInitialRevealState(3)
    state = applySectionTypewriterComplete(state, 0)
    state = applySectionPauseComplete(state)
    state = applySectionTypewriterComplete(state, 1)
    state = applySectionPauseComplete(state)
    state = applySectionTypewriterComplete(state, 2)
    expect(state.phase).toBe('done')
    expect(state.visibleSectionCount).toBe(3)
    expect(state.typingSectionIndex).toBe(null)
    expect(isPracticeRevealInProgress(state)).toBe(false)
  })

  it('ignores duplicate complete for wrong index', () => {
    const initial = createInitialRevealState(3)
    const unchanged = applySectionTypewriterComplete(initial, 1)
    expect(unchanged).toEqual(initial)
  })
})
