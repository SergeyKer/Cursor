import { describe, expect, it } from 'vitest'
import { buildReferenceMissTutorPrefill } from '@/lib/reference/buildReferenceMissTutorPrefill'

describe('buildReferenceMissTutorPrefill', () => {
  it('wraps short fragment for Explain', () => {
    expect(buildReferenceMissTutorPrefill('going to')).toBe(
      'Когда говорят «going to» и что это значит?'
    )
  })

  it('keeps explicit Russian question', () => {
    expect(buildReferenceMissTutorPrefill('Почему is going?')).toBe('Почему is going?')
  })

  it('keeps is going as question-shaped (starts with is)', () => {
    const out = buildReferenceMissTutorPrefill('is going')
    expect(out).toBe('is going')
  })

  it('returns empty for blank', () => {
    expect(buildReferenceMissTutorPrefill('   ')).toBe('')
  })
})
