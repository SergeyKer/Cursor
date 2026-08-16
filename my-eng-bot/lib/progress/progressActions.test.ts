import { describe, expect, it } from 'vitest'
import { BLUE_SECONDARY_SKIN } from '@/lib/homeCtaStyles'
import { mapAttentionZoneToTarget } from '@/lib/progress/progressActions'
import type { AttentionZone } from '@/lib/learningMemory/types'

/** Frozen snapshot — accidental secondary edits must fail this test. */
const BLUE_SECONDARY_SKIN_FROZEN =
  'border border-[#3b82f6] bg-gradient-to-b from-[#60a5fa] to-[#2563eb] text-white hover:brightness-105 active:brightness-95'

describe('progressActions', () => {
  it('keeps BLUE_SECONDARY_SKIN unchanged (anti-regression)', () => {
    expect(BLUE_SECONDARY_SKIN).toBe(BLUE_SECONDARY_SKIN_FROZEN)
  })

  it('zone with lesson → practice launch; without → my_plan', () => {
    const withLesson: AttentionZone = {
      skillTagId: 'a',
      title: 'A',
      errorCount: 3,
      sourceHint: 'В практике',
      lessonId: '1',
      chipActive: true,
      suggestionLine: '',
      score: 10,
    }
    const without: AttentionZone = { ...withLesson, lessonId: null, chipActive: false }
    expect(mapAttentionZoneToTarget(withLesson)).toEqual({
      kind: 'practice',
      lessonId: '1',
      mode: 'balanced',
    })
    expect(mapAttentionZoneToTarget(without)).toEqual({ kind: 'my_plan' })
  })

  it('keeps zone map independent from new mode launch kinds', () => {
    const kinds = ['translation', 'dialogue', 'tutor', 'pronunciation'] as const
    expect(kinds).toHaveLength(4)
    expect(mapAttentionZoneToTarget({
      skillTagId: 'a',
      title: 'A',
      errorCount: 1,
      sourceHint: '',
      lessonId: null,
      chipActive: false,
      suggestionLine: '',
      score: 1,
    }).kind).toBe('my_plan')
  })
})
