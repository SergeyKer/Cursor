import { describe, expect, it } from 'vitest'
import { resolveOpenReferenceSheet } from '@/lib/reference/openReferenceSheet'
import type { ReferenceSheet } from '@/lib/reference/types'

const runtimeStub: ReferenceSheet = {
  id: 'runtime',
  title: 'Runtime',
  teaser: 't',
  level: 'A2',
  hasPractice: false,
  hook: 'h',
  rule: ['r'],
  formula: ['f'],
  traps: [],
  examples: [{ en: 'Hi.', ru: 'Привет.', note: 'n' }],
  selfCheck: null,
  relatedLessonId: null,
}

describe('resolveOpenReferenceSheet', () => {
  it('resolves lesson 1–4', () => {
    const r = resolveOpenReferenceSheet({ lessonId: '4' })
    expect(r.kind).toBe('lesson')
    if (r.kind === 'lesson') {
      expect(r.lessonId).toBe('4')
      expect(r.sheet.relatedLessonId).toBe('4')
    }
  })

  it('resolves runtime sheet', () => {
    const r = resolveOpenReferenceSheet({ runtimeSheet: runtimeStub })
    expect(r).toEqual({ kind: 'runtime', sheet: runtimeStub })
  })

  it('missing for unknown lesson', () => {
    expect(resolveOpenReferenceSheet({ lessonId: '999' }).kind).toBe('missing')
    expect(resolveOpenReferenceSheet({}).kind).toBe('missing')
  })
})
