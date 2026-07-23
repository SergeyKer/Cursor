import { describe, expect, it } from 'vitest'
import { buildProgressStatusCopy } from '@/lib/progress/statusCopy'
import { createDefaultRewardsState } from '@/lib/rewardsState'
import { progressCopy } from '@/lib/uiCopy/progress'

describe('buildProgressStatusCopy', () => {
  it('marks streak active today without action CTA words', () => {
    const state = createDefaultRewardsState()
    state.progress.lastActiveDate = '2026-07-18'
    state.progress.dailyStreak = 2
    state.modeGoals.communication.status = 'in_progress'
    state.modeGoals.communication.goalProgress = 3
    state.modeGoals.communication.goalTarget = 7

    const status = buildProgressStatusCopy({
      rewardsState: state,
      copy: progressCopy('child'),
      audience: 'child',
      cupsEnabled: true,
      opportunity: null,
      today: '2026-07-18',
    })

    expect(status.streakStatusLine).toMatch(/уже есть|зафиксирована/i)
    expect(status.activeToday).toBe(true)
    expect(status.streakAtRisk).toBe(false)
    expect(status.streakEmpty).toBe(false)
    expect(status.modeGoals[0].line).toContain('3')
    expect(status.modeGoals[0].line).toContain('7')
    expect(status.focusPercent).toBeGreaterThan(0)
    expect(JSON.stringify(status).toLowerCase()).not.toContain('открыть челлендж')
    expect(JSON.stringify(status).toLowerCase()).not.toContain('следующий лучший шаг')
  })

  it('hides opportunity when null', () => {
    const status = buildProgressStatusCopy({
      rewardsState: createDefaultRewardsState(),
      copy: progressCopy('adult'),
      audience: 'adult',
      cupsEnabled: false,
      opportunity: null,
    })
    expect(status.opportunity).toBeNull()
  })

  it('builds opportunity status without CTA', () => {
    const status = buildProgressStatusCopy({
      rewardsState: createDefaultRewardsState(),
      copy: progressCopy('adult'),
      audience: 'adult',
      cupsEnabled: true,
      opportunity: {
        lessonId: '1',
        topic: 'Present',
        medal: 'gold',
        tier: 2,
        ringCount: 2,
        gemsPending: false,
        score: 1,
        label: 'Present: 2/5',
        reason: 'gold_ring',
      },
    })
    expect(status.opportunity?.label).toContain('Present')
    expect(status.opportunity?.reasonLine.toLowerCase()).not.toContain('открой')
  })

  it('marks streak at risk when not active today', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 3
    state.progress.lastActiveDate = '2026-07-17'
    const status = buildProgressStatusCopy({
      rewardsState: state,
      copy: progressCopy('adult'),
      audience: 'adult',
      cupsEnabled: false,
      opportunity: null,
      today: '2026-07-18',
    })
    expect(status.streakAtRisk).toBe(true)
    expect(status.streakEmpty).toBe(false)
    expect(status.streakStatusLine.toLowerCase()).toMatch(/угроз/)
  })

  it('marks streak empty at zero', () => {
    const status = buildProgressStatusCopy({
      rewardsState: createDefaultRewardsState(),
      copy: progressCopy('child'),
      audience: 'child',
      cupsEnabled: false,
      opportunity: null,
      today: '2026-07-18',
    })
    expect(status.streakEmpty).toBe(true)
    expect(status.streakAtRisk).toBe(false)
    expect(status.streakStatusLine).toMatch(/0 дней/i)
  })
})
