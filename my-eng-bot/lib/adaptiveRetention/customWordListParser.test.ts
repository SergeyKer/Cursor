import { describe, expect, it } from 'vitest'
import { parseCustomWordListText } from '@/lib/adaptiveRetention/customWordListParser'

describe('parseCustomWordListText', () => {
  it('parses common dash-separated homework lists', () => {
    const result = parseCustomWordListText('apple - яблоко\nboarding pass - посадочный талон')

    expect(result.validItems).toHaveLength(2)
    expect(result.validItems[0]).toMatchObject({ en: 'apple', ru: 'яблоко' })
    expect(result.errorCount).toBe(0)
  })

  it('parses table-like text with headers', () => {
    const result = parseCustomWordListText('word\ttranslation\texample\nticket\tбилет\tI need a ticket.')

    expect(result.validItems).toHaveLength(1)
    expect(result.validItems[0]).toMatchObject({
      en: 'ticket',
      ru: 'билет',
      example: 'I need a ticket.',
    })
  })

  it('reports duplicates and invalid rows without saving them as valid items', () => {
    const result = parseCustomWordListText('apple - яблоко\napple - яблоко\n123 - число\nwindow')

    expect(result.validItems).toHaveLength(1)
    expect(result.duplicateCount).toBe(1)
    expect(result.errorCount).toBe(2)
  })
})
