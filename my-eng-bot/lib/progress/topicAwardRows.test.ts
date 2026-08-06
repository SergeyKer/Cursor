import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { buildProgressShelf } from '@/lib/progress/buildProgressShelf'
import {
  resolveTopicAwardLaunch,
  toggleTopicAwardExpanded,
} from '@/lib/progress/topicAwardRows'
import { createDefaultRewardsState } from '@/lib/rewardsState'

describe('topicAwardRows', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds catalog practice topics on the shelf', () => {
    const shelf = buildProgressShelf(createDefaultRewardsState())
    expect(shelf.topicAwardRows.length).toBeGreaterThanOrEqual(4)
    expect(shelf.topicAwardRows.every((row) => row.lessonId)).toBe(true)
    const withBadge = shelf.topicAwardRows.filter((row) => row.hasPracticeBadge)
    expect(withBadge.length).toBeGreaterThanOrEqual(1)
    for (const row of withBadge) {
      expect(row.rankSteps).toHaveLength(3)
      expect(row.rankGlyph).toBeTruthy()
    }
  })

  it('toggles accordion: open A, open B closes A, close A', () => {
    expect(toggleTopicAwardExpanded(null, '1')).toBe('1')
    expect(toggleTopicAwardExpanded('1', '2')).toBe('2')
    expect(toggleTopicAwardExpanded('2', '2')).toBeNull()
  })

  it('resolves launch payloads for lesson, practice, challenge', () => {
    const row = {
      lessonId: '1',
      showChallengeCta: true,
    }
    expect(resolveTopicAwardLaunch(row, 'lesson')).toEqual({ kind: 'lesson', lessonId: '1' })
    expect(resolveTopicAwardLaunch(row, 'practice')).toEqual({
      kind: 'practice',
      lessonId: '1',
      mode: 'balanced',
    })
    expect(resolveTopicAwardLaunch(row, 'challenge')).toEqual({
      kind: 'practice',
      lessonId: '1',
      mode: 'challenge',
    })
    expect(resolveTopicAwardLaunch({ lessonId: '1', showChallengeCta: false }, 'challenge')).toEqual({
      kind: 'practice',
      lessonId: '1',
      mode: 'balanced',
    })
  })
})
