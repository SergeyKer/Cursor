import { describe, expect, it } from 'vitest'
import {
  resolveSessionExitKind,
  shouldShowSessionExitControl,
} from '@/lib/sessionExit/shouldShowSessionExitControl'

const base = {
  menuOpen: false,
  isStructuredLessonActive: false,
  activeStructuredLessonStatus: null as string | null,
  isPracticeActive: false,
  practiceSessionStatus: null as string | null,
  practiceFlowState: null as string | null,
}

describe('shouldShowSessionExitControl', () => {
  it('hides when menu is open', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        menuOpen: true,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'idle',
      })
    ).toBe(false)
  })

  it('shows for active structured lesson steps', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'idle',
      })
    ).toBe(true)
    expect(
      shouldShowSessionExitControl({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'checking',
      })
    ).toBe(true)
  })

  it('hides when lesson is completed / finale', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'completed',
      })
    ).toBe(false)
  })

  it('shows for practice active, correction, error', () => {
    for (const state of ['active', 'correction', 'error'] as const) {
      expect(
        shouldShowSessionExitControl({
          ...base,
          isPracticeActive: true,
          practiceSessionStatus: 'active',
          practiceFlowState: state,
        })
      ).toBe(true)
    }
  })

  it('hides for practice briefing, completed, idle', () => {
    for (const state of ['briefing', 'completed', 'idle'] as const) {
      expect(
        shouldShowSessionExitControl({
          ...base,
          isPracticeActive: true,
          practiceSessionStatus: 'active',
          practiceFlowState: state,
        })
      ).toBe(false)
    }
  })

  it('hides when practice session is not active', () => {
    expect(
      shouldShowSessionExitControl({
        ...base,
        isPracticeActive: true,
        practiceSessionStatus: 'completed',
        practiceFlowState: 'active',
      })
    ).toBe(false)
  })
})

describe('resolveSessionExitKind', () => {
  it('prefers lesson when both could apply', () => {
    expect(
      resolveSessionExitKind({
        isStructuredLessonActive: true,
        activeStructuredLessonStatus: 'idle',
        isPracticeActive: true,
      })
    ).toBe('lesson')
  })

  it('returns practice when only practice is active', () => {
    expect(
      resolveSessionExitKind({
        isStructuredLessonActive: false,
        activeStructuredLessonStatus: null,
        isPracticeActive: true,
      })
    ).toBe('practice')
  })
})
