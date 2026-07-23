import { describe, expect, it } from 'vitest'
import { formatLearningSignalForUser, formatRelativeDayLabel } from '@/lib/progress/formatLearningSignalForUser'
import type { LearningSignal } from '@/lib/learningMemory/types'
import {
  appendActiveDay,
  createDefaultRewardsState,
  normalizeActiveDays,
  withDailyActivity,
} from '@/lib/rewardsState'

describe('activeDays', () => {
  it('seeds from lastActiveDate when empty', () => {
    expect(normalizeActiveDays(undefined, '2026-07-18')).toEqual(['2026-07-18'])
  })

  it('appends today in withDailyActivity', () => {
    const state = createDefaultRewardsState()
    const next = withDailyActivity(state, '2026-07-20')
    expect(next.progress.lastActiveDate).toBe('2026-07-20')
    expect(next.progress.activeDays).toContain('2026-07-20')
  })

  it('fills missing today when already active', () => {
    let state = createDefaultRewardsState()
    state = withDailyActivity(state, '2026-07-20')
    state = {
      ...state,
      progress: { ...state.progress, activeDays: [] },
    }
    const next = withDailyActivity(state, '2026-07-20')
    expect(next.progress.activeDays).toEqual(['2026-07-20'])
  })

  it('dedupes appendActiveDay', () => {
    expect(appendActiveDay(['2026-07-01'], '2026-07-01')).toEqual(['2026-07-01'])
  })
})

describe('formatLearningSignalForUser', () => {
  const base: LearningSignal = {
    id: 's1',
    at: '2026-07-20T12:00:00.000Z',
    source: 'chat',
    detector: 'silent_assess',
    rawTopicIds: [],
    rawTopicTitles: [],
    lessonIdHint: null,
    skillTagIds: ['to-be'],
    snippet: { original: 'I is', corrected: 'I am' },
  }

  it('hides detector and softens snippet', () => {
    const item = formatLearningSignalForUser(base, 'adult', Date.parse('2026-07-20T18:00:00.000Z'))
    expect(item.line.toLowerCase()).not.toContain('silent_assess')
    expect(item.line).toContain('I is')
    expect(item.relativeDay).toBe('сегодня')
  })

  it('formats relative day', () => {
    expect(formatRelativeDayLabel('2026-07-19T12:00:00.000Z', Date.parse('2026-07-20T12:00:00.000Z'))).toBe(
      'вчера'
    )
  })
})
