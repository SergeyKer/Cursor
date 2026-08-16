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

  it('builds opportunity with continue CTA when ringCount > 0', () => {
    const copy = progressCopy('adult')
    const status = buildProgressStatusCopy({
      rewardsState: createDefaultRewardsState(),
      copy,
      audience: 'adult',
      cupsEnabled: true,
      opportunity: {
        lessonId: 'missing-topic',
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
    expect(status.opportunity?.title).toContain('Present')
    expect(status.opportunity?.title).toContain('🥇')
    expect(status.opportunity?.label).not.toMatch(/0\/5|2\/5/)
    expect(status.opportunity?.reasonLine).toBe('Ещё 3 зачёта — будет кубок.')
    expect(status.opportunity?.reasonLine.toLowerCase()).not.toContain('открой')
    expect(status.opportunity?.reasonLine.toLowerCase()).not.toContain('путь')
    expect(status.opportunity?.reasonLine.toLowerCase()).not.toContain('золото')
    expect(status.opportunity?.frame).toBe(copy.nearRewardTitle)
    expect(status.opportunity?.ctaLabel).toBe(copy.continuePractice)
  })

  it('builds opportunity with start CTA when ringCount is 0', () => {
    const copy = progressCopy('adult')
    const status = buildProgressStatusCopy({
      rewardsState: createDefaultRewardsState(),
      copy,
      audience: 'adult',
      cupsEnabled: true,
      opportunity: {
        lessonId: 'missing-topic',
        topic: 'Present',
        medal: 'gold',
        tier: 2,
        ringCount: 0,
        gemsPending: false,
        score: 1,
        label: 'Present: 0/5',
        reason: 'gold_ring',
      },
    })
    expect(status.opportunity?.ctaLabel).toBe(copy.startPractice)
  })

  it('child opportunity: I am title, remaining times to cup, train CTA', () => {
    const copy = progressCopy('child')
    const status = buildProgressStatusCopy({
      rewardsState: createDefaultRewardsState(),
      copy,
      audience: 'child',
      cupsEnabled: true,
      opportunity: {
        lessonId: '4',
        topic: 'Знакомство',
        medal: 'gold',
        tier: 2,
        ringCount: 0,
        gemsPending: false,
        score: 1,
        label: 'ignored',
        reason: 'gold_ring',
      },
    })
    expect(status.opportunity?.frame).toBe('Практика')
    expect(status.opportunity?.title).toBe('I am 🥇')
    expect(status.opportunity?.title).not.toContain('Знакомство')
    expect(status.opportunity?.reasonLine).toBe('Ещё 5 раз — будет кубок.')
    expect(status.opportunity?.reasonLine.toLowerCase()).not.toContain('золото')
    expect(status.opportunity?.reasonLine.toLowerCase()).not.toContain('зачёт')
    expect(status.opportunity?.ctaLabel).toBe('Тренировать')
  })

  it('gems_pending keeps claim copy and continue CTA when rings already exist', () => {
    const copy = progressCopy('adult')
    const status = buildProgressStatusCopy({
      rewardsState: createDefaultRewardsState(),
      copy,
      audience: 'adult',
      cupsEnabled: false,
      opportunity: {
        lessonId: 'missing-topic',
        topic: 'Present',
        medal: 'gold',
        tier: 2,
        ringCount: 5,
        gemsPending: true,
        score: 1,
        label: 'Present: забрать 💎',
        reason: 'gems_pending',
      },
    })
    expect(status.opportunity?.reasonLine).toBe('Заберите камень.')
    expect(status.opportunity?.reasonLine.toLowerCase()).not.toContain('ещё')
    expect(status.opportunity?.ctaLabel).toBe(copy.continuePractice)
  })

  it('tier1_ring title has no gold medal', () => {
    const status = buildProgressStatusCopy({
      rewardsState: createDefaultRewardsState(),
      copy: progressCopy('adult'),
      audience: 'adult',
      cupsEnabled: true,
      opportunity: {
        lessonId: 'missing-topic',
        topic: 'Present',
        medal: 'silver',
        tier: 1,
        ringCount: 1,
        gemsPending: false,
        score: 1,
        label: 'Present: 1/5',
        reason: 'tier1_ring',
      },
    })
    expect(status.opportunity?.title).toBe('Present')
    expect(status.opportunity?.title).not.toContain('🥇')
    expect(status.opportunity?.reasonLine).toBe('Ещё 4 зачёта — ближе к награде.')
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

  it('expired streak: restart copy, CTA not Начать, no recoverable warning', () => {
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
    expect(status.streakStatusHeadline).toBe('Занимайся 3 дня подряд')
    expect(status.streakStatusBody).toMatch(/каждый день \+10/)
    expect(status.streakStatusLine.toLowerCase()).not.toMatch(/рекорд|серия/)
    expect(status.streakCtaLabel).toBe('Заниматься сегодня')
  })

  it('expired adult: restart today, record as second sentence, CTA К занятиям', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.bestDailyStreak = 5
    state.progress.lastActiveDate = '2026-07-10'
    const status = buildProgressStatusCopy({
      rewardsState: state,
      copy: progressCopy('adult'),
      audience: 'adult',
      cupsEnabled: false,
      opportunity: null,
      today: '2026-07-18',
    })
    expect(status.streakExpired).toBe(true)
    expect(status.streakStatusHeadline).toBe('Начните снова сегодня')
    expect(status.streakStatusBody).toMatch(/3 дня подряд — снова \+10 XP/)
    expect(status.streakStatusBody).toMatch(/лучший результат был 5 дней/i)
    expect(status.streakCtaLabel).toBe('К занятиям')
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
