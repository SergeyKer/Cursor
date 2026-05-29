import { describe, expect, it } from 'vitest'
import {
  formatStreakFooterApplied,
  formatStreakFooterPreview,
  resolveStreakFooterOverlayLine,
  resolveStreakFooterPriorityLine,
  shouldIncludeStreakFooterPreview,
  shouldShowStreakFooterPreview,
} from './streakFooterHint'
import { formatStreakSessionHint } from './streakSessionHint'
import { streakDailyBonusXp } from './streakDailyBonus'
import { awardGlobalXp, createDefaultRewardsState, getTodayDateString } from './rewardsState'

describe('streakFooterHint', () => {
  const today = getTodayDateString()

  it('shows preview when streak>=3 and bonus not claimed', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 4
    expect(formatStreakFooterPreview(state, 'adult', today)).toContain('+10')
    expect(shouldShowStreakFooterPreview(state, today)).toBe(true)
  })

  it('returns null preview when streak<3 or bonus claimed', () => {
    const low = createDefaultRewardsState()
    low.progress.dailyStreak = 2
    expect(formatStreakFooterPreview(low, 'adult', today)).toBeNull()

    const claimed = createDefaultRewardsState()
    claimed.progress.dailyStreak = 5
    claimed.progress.lastStreakDailyBonusDate = today
    expect(formatStreakFooterPreview(claimed, 'adult', today)).toBeNull()
    expect(shouldShowStreakFooterPreview(claimed, today)).toBe(false)
  })

  it('formats applied ticker from lastReward streakBonus', () => {
    let state = createDefaultRewardsState()
    state.progress.dailyStreak = 2
    state.progress.lastActiveDate = '2026-05-18'
    state = awardGlobalXp(state, 5, 'communication_goal_progress', { today: '2026-05-19' })
    expect(formatStreakFooterApplied(state, 'adult')).toContain('+10')
    expect(formatStreakFooterApplied(state, 'child')).toContain('⚡3')
  })

  it('respects footer priority reward > sessionHint > preview', () => {
    expect(
      resolveStreakFooterPriorityLine({
        rewardTicker: 'Reward line',
        appliedTicker: 'Applied',
        sessionHint: 'Session',
        preview: 'Preview',
      }).source
    ).toBe('reward')
    expect(
      resolveStreakFooterPriorityLine({
        rewardTicker: null,
        appliedTicker: 'Applied',
        sessionHint: 'Session',
        preview: 'Preview',
      }).source
    ).toBe('applied')
    expect(
      resolveStreakFooterPriorityLine({
        rewardTicker: null,
        appliedTicker: null,
        sessionHint: 'Session',
        preview: 'Preview',
      }).source
    ).toBe('sessionHint')
    expect(
      resolveStreakFooterPriorityLine({
        rewardTicker: null,
        appliedTicker: null,
        sessionHint: null,
        preview: 'Preview',
      }).source
    ).toBe('preview')
  })

  it('hides preview during active lesson or task sessions', () => {
    expect(shouldIncludeStreakFooterPreview(null)).toBe(true)
    expect(shouldIncludeStreakFooterPreview('lesson-intro')).toBe(true)
    expect(shouldIncludeStreakFooterPreview('lesson')).toBe(false)
    expect(shouldIncludeStreakFooterPreview('lesson-learning')).toBe(false)
    expect(shouldIncludeStreakFooterPreview('practice')).toBe(false)
    expect(shouldIncludeStreakFooterPreview('communication')).toBe(false)
    expect(shouldIncludeStreakFooterPreview('engvo')).toBe(false)
    expect(shouldIncludeStreakFooterPreview('accent')).toBe(false)
  })

  describe('streak tiers 3/5/7 (+10/+15/+20)', () => {
    const tierCases = [
      { streak: 3, bonus: 10 },
      { streak: 4, bonus: 10 },
      { streak: 5, bonus: 15 },
      { streak: 6, bonus: 15 },
      { streak: 7, bonus: 20 },
      { streak: 12, bonus: 20 },
    ] as const

    for (const { streak, bonus } of tierCases) {
      it(`preview for streak ${streak} mentions +${bonus} on idle`, () => {
        const state = createDefaultRewardsState()
        state.progress.dailyStreak = streak
        expect(formatStreakFooterPreview(state, 'adult', today)).toContain(`+${bonus}`)
      })

      it(`session hint for streak ${streak} mentions +${bonus}`, () => {
        const state = createDefaultRewardsState()
        state.progress.dailyStreak = streak
        expect(formatStreakSessionHint(state, 'adult', today)).toContain(`+${bonus}`)
      })

      it(`during lesson streak ${streak} falls back to mode voice after hint consumed`, () => {
        const state = createDefaultRewardsState()
        state.progress.dailyStreak = streak
        const preview = formatStreakFooterPreview(state, 'adult', today)
        const lessonVoice = 'Почти. Попробуйте еще раз.'

        expect(
          resolveStreakFooterOverlayLine({
            modeFallback: lessonVoice,
            preview,
            sessionMode: 'lesson',
          })
        ).toBe(lessonVoice)

        expect(
          resolveStreakFooterPriorityLine({
            rewardTicker: null,
            appliedTicker: null,
            sessionHint: null,
            preview: shouldIncludeStreakFooterPreview('lesson') ? preview : null,
          }).source
        ).toBe('none')
      })

      it(`during lesson streak ${streak} shows session hint once at entry`, () => {
        const state = createDefaultRewardsState()
        state.progress.dailyStreak = streak
        const preview = formatStreakFooterPreview(state, 'adult', today)
        const sessionHint = formatStreakSessionHint(state, 'adult', today)
        const lessonVoice = 'Почти. Попробуйте еще раз.'

        expect(
          resolveStreakFooterOverlayLine({
            modeFallback: lessonVoice,
            preview,
            sessionHint,
            sessionMode: 'lesson',
          })
        ).toContain(`+${bonus}`)
      })
    }

    it('maps tier boundaries through streakDailyBonusXp', () => {
      expect(streakDailyBonusXp(2)).toBe(0)
      expect(streakDailyBonusXp(3)).toBe(10)
      expect(streakDailyBonusXp(5)).toBe(15)
      expect(streakDailyBonusXp(7)).toBe(20)
    })
  })
})
