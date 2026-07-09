import { describe, expect, it } from 'vitest'
import { isPartialUserTranscriptStatus } from './userTranscriptStatus'

describe('isPartialUserTranscriptStatus', () => {
  it('treats in_progress and incomplete as partial', () => {
    expect(isPartialUserTranscriptStatus('in_progress')).toBe(true)
    expect(isPartialUserTranscriptStatus('incomplete')).toBe(true)
  })

  it('treats completed, missing, and other values as final-eligible', () => {
    expect(isPartialUserTranscriptStatus('completed')).toBe(false)
    expect(isPartialUserTranscriptStatus(undefined)).toBe(false)
    expect(isPartialUserTranscriptStatus(null)).toBe(false)
    expect(isPartialUserTranscriptStatus('')).toBe(false)
  })
})
