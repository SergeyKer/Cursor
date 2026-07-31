import { describe, expect, it } from 'vitest'
import { buildProgressStatusCopy } from '@/lib/progress/statusCopy'
import { createDefaultRewardsState } from '@/lib/rewardsState'
import { progressCopy } from '@/lib/uiCopy/progress'

describe('buildProgressStatusCopy', () => {
  it('active today under 3: praise, continue now, path to +10, CTA Продолжить', () => {
    const state = createDefaultRewardsState()
    state.progress.lastActiveDate = '2026-07-18'
    state.progress.dailyStreak = 2
    state.modeGoals.communication.status = 'in_progress'
    state.modeGoals.communication.goalProgress = 3
    state.modeGoals.communication.goalTarget = 7
    state.communicationSession = {
      ...state.communicationSession,
      status: 'in_progress',
      progress: 3,
      target: 8,
      sessionStartedAt: '2026-07-18T12:00:00.000Z',
    }

    const status = buildProgressStatusCopy({
      rewardsState: state,
      copy: progressCopy('child'),
      audience: 'child',
      cupsEnabled: true,
      opportunity: null,
      today: '2026-07-18',
    })

    expect(status.streakStatusLine).toMatch(/молодец/i)
    expect(status.streakStatusLine).toMatch(/серия уже 2 дня/i)
    expect(status.streakStatusLine).toMatch(/продолжай сейчас/i)
    expect(status.streakStatusLine).toMatch(/\+10 XP/i)
    expect(status.streakStatusLine.toLowerCase()).not.toMatch(/угроз|сгор|зафиксирована|на сегодня ок/)
    expect(status.activeToday).toBe(true)
    expect(status.streakRecoverable).toBe(false)
    expect(status.streakExpired).toBe(false)
    expect(status.streakAtRisk).toBe(false)
    expect(status.streakCtaLabel).toBe('Продолжить')
    expect(status.modeGoals[0].line).toContain('3')
    expect(status.focusPercent).toBeGreaterThan(0)
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

  it('recoverable streak 5: save bonus +15, warning recoverable, CTA Сохранить серию', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.bestDailyStreak = 5
    state.progress.lastActiveDate = '2026-07-17'
    const status = buildProgressStatusCopy({
      rewardsState: state,
      copy: progressCopy('adult'),
      audience: 'adult',
      cupsEnabled: false,
      opportunity: null,
      today: '2026-07-18',
    })
    expect(status.streakRecoverable).toBe(true)
    expect(status.streakExpired).toBe(false)
    expect(status.streakAtRisk).toBe(true)
    expect(status.streakStatusLine).toMatch(/отличная серия — 5 дней/i)
    expect(status.streakStatusLine).toMatch(/\+15 XP/)
    expect(status.streakStatusLine.toLowerCase()).not.toMatch(/угроз|сгор|потеряешь/)
    expect(status.streakCtaLabel).toBe('Сохранить серию')
  })

  it('recoverable streak 2: days word and path to +10', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 2
    state.progress.lastActiveDate = '2026-07-17'
    const status = buildProgressStatusCopy({
      rewardsState: state,
      copy: progressCopy('child'),
      audience: 'child',
      cupsEnabled: false,
      opportunity: null,
      today: '2026-07-18',
    })
    expect(status.streakRecoverable).toBe(true)
    expect(status.streakStatusLine).toMatch(/серия 2 дня/i)
    expect(status.streakStatusLine).toMatch(/\+10 XP/)
    expect(status.streakCtaLabel).toBe('Сохранить серию')
  })

  it('active today streak 7: opens +20, CTA Продолжить', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 7
    state.progress.lastActiveDate = '2026-07-18'
    const status = buildProgressStatusCopy({
      rewardsState: state,
      copy: progressCopy('adult'),
      audience: 'adult',
      cupsEnabled: false,
      opportunity: null,
      today: '2026-07-18',
    })
    expect(status.activeToday).toBe(true)
    expect(status.streakStatusLine).toMatch(/7 дней/)
    expect(status.streakStatusLine).toMatch(/открывает \+20 XP/)
    expect(status.streakStatusLine).toMatch(/завтра/)
    expect(status.streakCtaLabel).toBe('Продолжить')
  })

  it('expired streak: past record, CTA Начать, no recoverable warning', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.bestDailyStreak = 5
    state.progress.lastActiveDate = '2026-07-10'
    const status = buildProgressStatusCopy({
      rewardsState: state,
      copy: progressCopy('child'),
      audience: 'child',
      cupsEnabled: false,
      opportunity: null,
      today: '2026-07-18',
    })
    expect(status.streakExpired).toBe(true)
    expect(status.streakRecoverable).toBe(false)
    expect(status.streakAtRisk).toBe(false)
    expect(status.streakStatusLine).toMatch(/прошлый рекорд — 5 дней/i)
    expect(status.streakStatusLine.toLowerCase()).not.toMatch(/сохрани серию 5|угроз/)
    expect(status.streakCtaLabel).toBe('Начать')
  })

  it('marks streak empty at zero with start CTA', () => {
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
    expect(status.streakRecoverable).toBe(false)
    expect(status.streakStatusLine).toMatch(/первый шаг/i)
    expect(status.streakStatusLine).toMatch(/\+10 XP/)
    expect(status.streakCtaLabel).toBe('Начать')
  })
})
