import { describe, expect, it, vi } from 'vitest'
import {
  resolvePracticeFlowStateForSession,
  shouldShowPracticeInstructionBriefing,
} from '@/lib/practice/practiceSessionFlow'
import type { PracticeSession } from '@/types/practice'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: { practiceInstructionBlockV1: true },
}))

const baseSession = (): PracticeSession => ({
  id: 'p1',
  lessonId: '1',
  topic: 'Test',
  level: 'A1',
  mode: 'reference',
  entrySource: 'menu',
  generationSource: 'local',
  source: { kind: 'static_lesson', lessonId: '1' },
  status: 'active',
  questions: [],
  currentIndex: 0,
  answers: [],
  score: 0,
  xp: 0,
  streak: 0,
  startedAt: 1,
  version: 1,
})

describe('practiceSessionFlow', () => {
  it('shows briefing when not acknowledged', () => {
    expect(shouldShowPracticeInstructionBriefing(baseSession())).toBe(true)
    expect(resolvePracticeFlowStateForSession(baseSession())).toBe('briefing')
  })

  it('skips briefing when acknowledged', () => {
    const session = { ...baseSession(), instructionAcknowledged: true }
    expect(shouldShowPracticeInstructionBriefing(session)).toBe(false)
    expect(resolvePracticeFlowStateForSession(session)).toBe('active')
  })
})
