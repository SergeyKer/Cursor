import { describe, expect, it } from 'vitest'
import { buildProgressModeRows, countVocabProgressMarks } from '@/lib/progress/buildProgressModeRows'
import { createDefaultRewardsState } from '@/lib/rewardsState'
import { progressCopy } from '@/lib/uiCopy/progress'

const FLAGS_ALL = {
  engvoVoiceV1: true,
  practiceEngineV1: true,
  tutorChatV1: true,
  accentTrainerV1: true,
}

function emptySources() {
  return {
    medals: { gold: 0, silver: 0, bronze: 0 },
    practiceBadgeStats: { opened: 0, gold: 0, total: 12 },
    nearestBadge: null,
    vocab: { study: 0, mistakes: 0, know: 0 },
    tutorTodayCount: 0,
    accent: { attempts: 0, bestScore: 0 },
  }
}

describe('buildProgressModeRows', () => {
  it('empty sessions show not-started, not 0/8', () => {
    const copy = progressCopy('child')
    const rows = buildProgressModeRows({
      copy,
      audience: 'child',
      flags: FLAGS_ALL,
      rewardsState: createDefaultRewardsState(),
      ...emptySources(),
    })
    expect(rows.map((row) => row.id)).toEqual([
      'communication',
      'engvo',
      'lesson',
      'practice',
      'translation',
      'dialogue',
      'vocabulary',
      'tutor',
      'pronunciation',
    ])
    for (const row of rows) {
      expect(row.metric).toBe(copy.statusNotStarted)
      expect(row.metric).not.toMatch(/0\s*из\s*8/)
    }
  })

  it('translation in_progress uses session progress/target', () => {
    const state = createDefaultRewardsState()
    state.translationSession = {
      ...state.translationSession,
      status: 'in_progress',
      progress: 3,
      target: 8,
    }
    const rows = buildProgressModeRows({
      copy: progressCopy('adult'),
      audience: 'adult',
      flags: FLAGS_ALL,
      rewardsState: state,
      ...emptySources(),
    })
    const translation = rows.find((row) => row.id === 'translation')
    expect(translation?.metric).toContain('3/8')
    expect(translation?.target).toEqual({ kind: 'translation' })
  })

  it('vocab counts study / mistakes / know', () => {
    const marks = countVocabProgressMarks(
      {
        '1': { userMark: 'study' },
        '2': { userMark: 'know' },
        '3': { userMark: 'study' },
        '4': { userMark: null },
      },
      4
    )
    expect(marks).toEqual({ study: 2, mistakes: 4, know: 1 })
    const rows = buildProgressModeRows({
      copy: progressCopy('child'),
      audience: 'child',
      flags: FLAGS_ALL,
      rewardsState: createDefaultRewardsState(),
      ...emptySources(),
      vocab: marks,
    })
    expect(rows.find((row) => row.id === 'vocabulary')?.metric).toBe('учу 2 · ошибки 4 · умею 1')
  })

  it('flag-off hides tutor and accent', () => {
    const rows = buildProgressModeRows({
      copy: progressCopy('adult'),
      audience: 'adult',
      flags: {
        engvoVoiceV1: false,
        practiceEngineV1: false,
        tutorChatV1: false,
        accentTrainerV1: false,
      },
      rewardsState: createDefaultRewardsState(),
      ...emptySources(),
    })
    expect(rows.map((row) => row.id)).toEqual([
      'communication',
      'lesson',
      'translation',
      'dialogue',
      'vocabulary',
    ])
  })

  it('lesson row launches awards detail', () => {
    const rows = buildProgressModeRows({
      copy: progressCopy('adult'),
      audience: 'adult',
      flags: FLAGS_ALL,
      rewardsState: createDefaultRewardsState(),
      ...emptySources(),
      medals: { gold: 1, silver: 0, bronze: 2 },
    })
    const lesson = rows.find((row) => row.id === 'lesson')
    expect(lesson?.metric).toBe('3')
    expect(lesson?.target).toEqual({ kind: 'detail', detail: 'awards' })
  })
})
