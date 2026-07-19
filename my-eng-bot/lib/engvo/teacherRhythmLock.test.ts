import { describe, expect, it } from 'vitest'
import {
  TEACHER_RHYTHM_LOCK_MARKER,
  TEACHER_RHYTHM_LOCK_MAX_CHARS,
  buildEngvoTeacherRhythmLockRule,
} from '@/lib/engvo/teacherPrompts'

describe('buildEngvoTeacherRhythmLockRule', () => {
  it('starts with stable marker and stays under max length', () => {
    for (const level of ['a1', 'a2', 'b1'] as const) {
      for (const audience of ['adult', 'child'] as const) {
        const text = buildEngvoTeacherRhythmLockRule(level, audience)
        expect(text.startsWith(TEACHER_RHYTHM_LOCK_MARKER)).toBe(true)
        expect(text.length).toBeLessThanOrEqual(TEACHER_RHYTHM_LOCK_MAX_CHARS)
      }
    }
  })

  it('includes reclaim priorities and anti-meta-farm', () => {
    const text = buildEngvoTeacherRhythmLockRule('a2', 'adult')
    // Restored voice baseline (cb633dc): "pending Скажи/repeat"; post-f81a545 used "pending repeat".
    expect(text).toMatch(/pending (?:Скажи\/)?repeat/i)
    expect(text).toMatch(/same Russian/i)
    expect(text).toMatch(/locked topic/i)
    expect(text).toMatch(/skip repeat curiosity-praise/i)
    expect(text).toMatch(/never silent wait/i)
    expect(text).toMatch(/no debate/i)
    expect(text).toMatch(/no moral lecture/i)
    expect(text).toMatch(/no free-call follow-up/i)
  })

  it('uses RU bridge orientation for A2 adult', () => {
    const text = buildEngvoTeacherRhythmLockRule('a2', 'adult')
    expect(text).toMatch(/Классно, что заметил/)
    expect(text).toMatch(/Хорошо, что спрашиваешь/)
    expect(text).not.toMatch(/Good catch/)
  })

  it('uses EN bridge orientation for B1 adult', () => {
    const text = buildEngvoTeacherRhythmLockRule('b1', 'adult')
    expect(text).toMatch(/Good catch/)
    expect(text).toMatch(/Nice that you're curious/)
    expect(text).not.toMatch(/Классно, что заметил/)
  })

  it('uses child-oriented bridge for A1 child', () => {
    const text = buildEngvoTeacherRhythmLockRule('a1', 'child')
    expect(text).toMatch(/Классно, что спросил/)
    expect(text).toMatch(/а теперь дальше/)
    expect(text).toMatch(/fuse/i)
  })

  it('A2 child bridge is not a bare hard cut', () => {
    const text = buildEngvoTeacherRhythmLockRule('a2', 'child')
    expect(text).toMatch(/А теперь дальше/)
    expect(text).not.toMatch(/→ «Дальше\.»/)
  })
})
