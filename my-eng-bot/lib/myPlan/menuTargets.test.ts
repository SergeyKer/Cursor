import { describe, expect, it } from 'vitest'

/** Pure helper: empty CTA → lessons, status link → progress. */
export function resolveMyPlanMenuTarget(
  intent: 'empty_lessons' | 'status_progress'
): 'lessons' | 'progress' {
  return intent === 'empty_lessons' ? 'lessons' : 'progress'
}

describe('resolveMyPlanMenuTarget', () => {
  it('maps empty to lessons and status to progress', () => {
    expect(resolveMyPlanMenuTarget('empty_lessons')).toBe('lessons')
    expect(resolveMyPlanMenuTarget('status_progress')).toBe('progress')
  })
})
