import { describe, expect, it } from 'vitest'
import { formatLearningSignalForUser, formatRelativeDayLabel, listRemarksPreview } from '@/lib/progress/formatLearningSignalForUser'
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

  it('hides detector and keeps phrase arrow for adult', () => {
    const item = formatLearningSignalForUser(base, 'adult', Date.parse('2026-07-20T18:00:00.000Z'))
    expect(item).not.toBeNull()
    expect(item!.line.toLowerCase()).not.toContain('silent_assess')
    expect(item!.contextLine).toContain('разбор фразы')
    expect(item!.bodyLines.join(' ')).toContain('I is')
    expect(item!.bodyLines.join(' ')).toContain('→')
    expect(item!.relativeDay).toBe('сегодня')
  })

  it('formats quiz without an arrow', () => {
    const quiz: LearningSignal = {
      ...base,
      id: 'q1',
      source: 'tutor',
      detector: 'tutor_micro',
      skillTagIds: ['have-got'],
      rawTopicIds: ['have-got'],
      rawTopicTitles: ['have vs have got'],
      snippet: { original: 'I have a cat.', corrected: "I've got a dog." },
    }
    const item = formatLearningSignalForUser(quiz, 'adult', Date.parse('2026-07-20T18:00:00.000Z'))
    expect(item!.bodyLines.join(' ')).not.toContain('→')
    expect(item!.bodyLines[0]).toContain('Выбрал')
    expect(item!.bodyLines[1]).toContain('Верно')
    expect(item!.contextLine).toContain('задание')
  })

  it('shows child the correct form first', () => {
    const item = formatLearningSignalForUser(base, 'child', Date.parse('2026-07-20T18:00:00.000Z'))
    expect(item!.bodyLines[0]).toMatch(/^Надо:/)
    expect(item!.contextLine).not.toContain('разбор фразы')
    expect(item!.why).toBeUndefined()
  })

  it('formats relative day', () => {
    expect(formatRelativeDayLabel('2026-07-19T12:00:00.000Z', Date.parse('2026-07-20T12:00:00.000Z'))).toBe(
      'вчера'
    )
  })

  it('uses calendar day instead of ранее', () => {
    const now = new Date(2026, 7, 20, 12, 0, 0).getTime()
    const at = new Date(2026, 7, 12, 15, 0, 0).toISOString()
    expect(formatRelativeDayLabel(at, now)).toBe('12 авг')
    const old = new Date(2025, 7, 12, 15, 0, 0).toISOString()
    expect(formatRelativeDayLabel(old, now)).toBe('12 авг 2025')
  })

  it('collapses repeated tutor micros on preview', () => {
    const now = Date.parse('2026-07-20T18:00:00.000Z')
    const quizzes: LearningSignal[] = [0, 1, 2, 3].map((i) => ({
      ...base,
      id: `q${i}`,
      at: `2026-07-20T12:0${i}:00.000Z`,
      source: 'tutor' as const,
      detector: 'tutor_micro' as const,
      skillTagIds: ['have-got'],
      rawTopicIds: ['have-got'],
      rawTopicTitles: ['have vs have got'],
      snippet: { original: `opt ${i}`, corrected: 'right' },
    }))
    const preview = listRemarksPreview([base, ...quizzes], 'adult', now)
    expect(preview.length).toBeLessThanOrEqual(3)
    const task = preview.find((p) => p.contextLine.includes('задание'))
    expect(task?.repeatCount).toBe(4)
    expect(task?.contextLine).toMatch(/4 раза/)
    expect(preview.some((p) => p.contextLine.includes('разбор фразы'))).toBe(true)
  })
})
