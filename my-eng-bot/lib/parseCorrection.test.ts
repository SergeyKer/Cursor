import { describe, expect, it } from 'vitest'
import { parseCorrection } from './parseCorrection'

describe('parseCorrection', () => {
  it('keeps multiline comment text together until the next header', () => {
    const result = parseCorrection(
      [
        'Комментарий: First point.',
        'Second point.',
        'Third point.',
        'Время: Present Simple.',
        'Повтори: I often do my homework.',
      ].join('\n')
    )

    expect(result.comment).toBe('First point.\nSecond point.\nThird point.')
    expect(result.rest).toBe('Время: Present Simple.\nПовтори: I often do my homework.')
  })
})
