import { describe, expect, it } from 'vitest'
import { buildReferenceMissTutorPrefill } from '@/lib/reference/buildReferenceMissTutorPrefill'

describe('buildReferenceMissTutorPrefill', () => {
  it('wraps short fragment for Explain as rule', () => {
    expect(buildReferenceMissTutorPrefill('going to')).toBe('Разбери правило: «going to»')
  })

  it('wraps be invited as rule', () => {
    expect(buildReferenceMissTutorPrefill('be invited')).toBe('Разбери правило: «be invited»')
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
