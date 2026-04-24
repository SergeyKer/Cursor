import { describe, expect, it } from 'vitest'
import { isLikelySttSilenceHallucination } from './isLikelySttSilenceHallucination'

describe('isLikelySttSilenceHallucination', () => {
  it('matches common hallucination phrases from silence', () => {
    expect(isLikelySttSilenceHallucination('Thank you for watching')).toBe(true)
    expect(isLikelySttSilenceHallucination(' thanks for watching. ')).toBe(true)
    expect(isLikelySttSilenceHallucination('THANK YOU FOR LISTENING...')).toBe(true)
  })

  it('does not match ordinary dictation', () => {
    expect(isLikelySttSilenceHallucination('Thank you for your help')).toBe(false)
    expect(isLikelySttSilenceHallucination('I am watching a movie')).toBe(false)
  })
})
