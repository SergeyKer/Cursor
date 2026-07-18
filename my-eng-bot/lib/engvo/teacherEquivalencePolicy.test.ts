import { describe, expect, it } from 'vitest'
import {
  TEACHER_EQUIVALENCE_GOLDEN_FRAGMENTS,
  TEACHER_EQUIVALENCE_POLICY_MARKER,
  TEACHER_EQUIVALENCE_POLICY_MAX_CHARS,
  buildTeacherEquivalencePolicyBlock,
} from '@/lib/engvo/teacherEquivalencePolicy'

describe('buildTeacherEquivalencePolicyBlock', () => {
  it('starts with stable marker and stays under max length', () => {
    for (const level of ['a1', 'a2', 'b1'] as const) {
      const text = buildTeacherEquivalencePolicyBlock(level)
      expect(text.startsWith(TEACHER_EQUIVALENCE_POLICY_MARKER)).toBe(true)
      expect(text.length).toBeLessThanOrEqual(TEACHER_EQUIVALENCE_POLICY_MAX_CHARS)
    }
  })

  it('includes canonical/accepted/meta and school at/in anchors', () => {
    const text = buildTeacherEquivalencePolicyBlock('a2')
    expect(text).toMatch(/canonical/i)
    expect(text).toMatch(/accepted/i)
    expect(text).toMatch(/Meta/i)
    expect(text).toMatch(/\bat\b/)
    expect(text).toMatch(/\bin\b/)
    expect(text).toMatch(/works/)
    expect(text).toMatch(/Неправильно/)
    expect(text).toMatch(/Incorrect/)
  })

  it('embeds all golden fragments from the school bug', () => {
    const text = buildTeacherEquivalencePolicyBlock('a2')
    for (const fragment of TEACHER_EQUIVALENCE_GOLDEN_FRAGMENTS) {
      expect(text).toContain(fragment)
    }
  })

  it('A1 avoids proactive contrast lecture invitation; A2+ keeps meta contrast rule', () => {
    const a1 = buildTeacherEquivalencePolicyBlock('a1')
    const a2 = buildTeacherEquivalencePolicyBlock('a2')
    expect(a1).toMatch(/no prep lecture/i)
    expect(a1).not.toMatch(/both always the same/i)
    expect(a2).toMatch(/both always the same/i)
    expect(a1.length).toBeLessThanOrEqual(a2.length)
  })
})
