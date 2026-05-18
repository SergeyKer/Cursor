import { describe, expect, it } from 'vitest'
import { formatCallDuration } from './formatCallDuration'

describe('formatCallDuration', () => {
  it('formats zero and sub-minute durations', () => {
    expect(formatCallDuration(0)).toBe('00:00')
    expect(formatCallDuration(5)).toBe('00:05')
    expect(formatCallDuration(59)).toBe('00:59')
  })

  it('formats minutes and seconds', () => {
    expect(formatCallDuration(65)).toBe('01:05')
    expect(formatCallDuration(3599)).toBe('59:59')
  })

  it('floors fractional seconds and clamps negatives', () => {
    expect(formatCallDuration(65.9)).toBe('01:05')
    expect(formatCallDuration(-10)).toBe('00:00')
  })
})
