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
        'Скажи: I often do my homework.',
      ].join('\n')
    )

    expect(result.comment).toBe('First point.\nSecond point.\nThird point.')
    expect(result.rest).toBe('Время: Present Simple.\nСкажи: I often do my homework.')
  })

  it('ends Комментарий before Ошибки', () => {
    const result = parseCorrection(
      [
        'Комментарий: Кратко.',
        'Ошибки:',
        '✏️ x → y',
        'Время: Present Simple.',
        'Скажи: I run.',
      ].join('\n')
    )

    expect(result.comment).toBe('Кратко.')
    expect(result.rest).toContain('Ошибки:')
    expect(result.rest).toContain('✏️')
  })
})
