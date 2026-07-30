import { describe, expect, it } from 'vitest'
import { createDefaultRewardsState, normalizeTranslationSession } from './rewardsState'

describe('normalizeTranslationSession', () => {
  it('soft-defaults missing payload without version bump', () => {
    const session = normalizeTranslationSession(undefined)
    expect(session.target).toBe(8)
    expect(session.status).toBe('not_started')
    expect(createDefaultRewardsState().translationSession).toEqual(session)
  })

  it('expires in-progress sessions past TTL', () => {
    const started = new Date(Date.now() - 46 * 60 * 1000).toISOString()
    const session = normalizeTranslationSession(
      {
        target: 8,
        progress: 3,
        sessionXpAwarded: 12,
        status: 'in_progress',
        sessionStartedAt: started,
        lastAwardedAssistantKey: 'x',
        dailyXpAwarded: 12,
        dailyXpDate: '2099-01-01',
      },
      { today: '2099-01-01' }
    )
    expect(session.status).toBe('abandoned')
    expect(session.progress).toBe(0)
    expect(session.dailyXpAwarded).toBe(12)
  })
})
