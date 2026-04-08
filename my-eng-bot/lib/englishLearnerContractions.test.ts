import { describe, expect, it } from 'vitest'
import { normalizeEnglishLearnerContractions } from './englishLearnerContractions'

describe('normalizeEnglishLearnerContractions', () => {
  it('normalizes do/does/did negatives', () => {
    expect(normalizeEnglishLearnerContractions('I do not read.')).toBe("I don't read.")
    expect(normalizeEnglishLearnerContractions('He does not read.')).toBe("He doesn't read.")
    expect(normalizeEnglishLearnerContractions('They did not read.')).toBe("They didn't read.")
  })

  it('normalizes modal and be negatives', () => {
    expect(normalizeEnglishLearnerContractions('I will not go.')).toBe("I won't go.")
    expect(normalizeEnglishLearnerContractions('You are not late.')).toBe("You aren't late.")
    expect(normalizeEnglishLearnerContractions('I am not ready.')).toBe("I'm not ready.")
  })

  it('normalizes cannot variants and keeps unrelated text', () => {
    expect(normalizeEnglishLearnerContractions('I cannot swim.')).toBe("I can't swim.")
    expect(normalizeEnglishLearnerContractions('I can not swim.')).toBe("I can't swim.")
    expect(normalizeEnglishLearnerContractions('Do you cook every day?')).toBe('Do you cook every day?')
    expect(normalizeEnglishLearnerContractions('I will cook every day.')).toBe('I will cook every day.')
  })

  it('preserves leading capitalization', () => {
    expect(normalizeEnglishLearnerContractions('Do not worry.')).toBe("Don't worry.")
  })
})
