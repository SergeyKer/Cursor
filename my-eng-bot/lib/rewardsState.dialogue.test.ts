import { describe, expect, it } from 'vitest'
import { createDefaultRewardsState, normalizeDialogueSession } from './rewardsState'

describe('normalizeDialogueSession', () => {
  it('soft-defaults missing payload without version bump', () => {
    const session = normalizeDialogueSession(undefined)
    expect(session.target).toBe(8)
    expect(session.status).toBe('not_started')
    expect(createDefaultRewardsState().dialogueSession).toEqual(session)
  })

  it('expires in-progress sessions past TTL', () => {
    const started = new Date(Date.now() - 46 * 60 * 1000).toISOString()
    const session = normalizeDialogueSession(
      {
        target: 8,
        progress: 3,
        sessionXpAwarded: 9,
        status: 'in_progress',
        sessionStartedAt: started,
        lastAwardedAssistantKey: 'x',
        dailyXpAwarded: 9,
        dailyXpDate: '2099-01-01',
      },
      { today: '2099-01-01' }
    )
    expect(session.status).toBe('abandoned')
    expect(session.progress).toBe(0)
    expect(session.dailyXpAwarded).toBe(9)
  })
})
