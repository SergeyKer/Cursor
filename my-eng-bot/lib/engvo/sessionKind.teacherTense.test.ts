import { describe, expect, it } from 'vitest'
import {
  isEngvoTeacherConcreteTense,
  isEngvoTeacherTense,
  sanitizeEngvoTeacherTenseForAudience,
} from './sessionKind'

describe('engvo teacher tense preference', () => {
  it('accepts meta all as preference', () => {
    expect(isEngvoTeacherTense('all')).toBe(true)
    expect(isEngvoTeacherConcreteTense('all')).toBe(false)
    expect(isEngvoTeacherConcreteTense('present_simple')).toBe(true)
  })

  it('sanitize keeps all for adult and child', () => {
    expect(sanitizeEngvoTeacherTenseForAudience('all', 'adult')).toBe('all')
    expect(sanitizeEngvoTeacherTenseForAudience('all', 'child')).toBe('all')
  })

  it('sanitize rejects invalid concrete for adult', () => {
    expect(sanitizeEngvoTeacherTenseForAudience('not_a_tense' as never, 'adult')).toBe(
      'present_simple'
    )
  })
})
