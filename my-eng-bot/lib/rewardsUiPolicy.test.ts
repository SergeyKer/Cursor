import { describe, expect, it } from 'vitest'
import {
  buildRewardPopupText,
  rewardReasonAllowsDynamicTickerOverride,
  rewardReasonShowsToast,
} from './rewardsUiPolicy'

describe('rewardsUiPolicy', () => {
  it('treats communication and engvo per-turn progress as quiet for footer ticker override', () => {
    expect(rewardReasonAllowsDynamicTickerOverride('communication_goal_progress')).toBe(false)
    expect(rewardReasonAllowsDynamicTickerOverride('engvo_goal_progress')).toBe(false)
    expect(rewardReasonAllowsDynamicTickerOverride('lesson_completed')).toBe(true)
    expect(rewardReasonAllowsDynamicTickerOverride('lesson_xp_awarded')).toBe(true)
  })

  it('shows toast for milestones and level-up only', () => {
    expect(rewardReasonShowsToast('communication_goal_progress', false)).toBe(false)
    expect(rewardReasonShowsToast('engvo_goal_progress', false)).toBe(false)
    expect(rewardReasonShowsToast('lesson_step_completed', false)).toBe(false)
    expect(rewardReasonShowsToast('lesson_completed', false)).toBe(true)
    expect(rewardReasonShowsToast('practice_completed', false)).toBe(true)
    expect(rewardReasonShowsToast('accent_session_completed', false)).toBe(true)
    expect(rewardReasonShowsToast('communication_goal_completed', false)).toBe(true)
    expect(rewardReasonShowsToast('engvo_goal_completed', false)).toBe(true)
    expect(rewardReasonShowsToast('communication_goal_progress', true)).toBe(true)
  })

  it('builds readable popup lines', () => {
    expect(
      buildRewardPopupText({
        reason: 'lesson_completed',
        amount: 45,
        levelUp: null,
      })
    ).toBe('Урок закрыт. +45 XP')
    expect(
      buildRewardPopupText({
        reason: 'communication_goal_completed',
        amount: 40,
        levelUp: null,
      })
    ).toBe('Цель общения 7/7 закрыта. +40 XP')
    expect(
      buildRewardPopupText({
        reason: 'lesson_step_completed',
        amount: 10,
        levelUp: { from: 1, to: 2 },
      })
    ).toBe('Новый уровень 2. +10 XP')
  })

  it('avoids exact duplication with top line text', () => {
    expect(
      buildRewardPopupText({
        reason: 'lesson_completed',
        amount: 45,
        levelUp: null,
        avoidText: 'Урок закрыт. +45 XP',
      })
    ).toBe('Урок завершён. +45 XP')
  })

  it('supports child popup copy variants', () => {
    expect(
      buildRewardPopupText({
        reason: 'practice_completed',
        amount: 30,
        levelUp: null,
        audience: 'child',
      })
    ).toBe('Практика завершена! +30 XP!')
  })
})
