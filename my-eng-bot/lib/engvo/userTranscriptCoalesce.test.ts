import { describe, expect, it } from 'vitest'
import { ENGVO_XAI_USER_COALESCE_WINDOW_MS } from './constants'
import {
  normalizeEngvoUserTranscriptForCompare,
  shouldCoalesceEngvoUserTranscript,
} from './userTranscriptCoalesce'

describe('shouldCoalesceEngvoUserTranscript', () => {
  it('coalesces near-identical finals inside the window', () => {
    expect(
      shouldCoalesceEngvoUserTranscript({
        previousUserText: "I'm fine.",
        nextUserText: 'I am fine.',
        elapsedMsSincePreviousUser: 800,
      })
    ).toBe(true)

    expect(
      shouldCoalesceEngvoUserTranscript({
        previousUserText: "I'm fine.",
        nextUserText: "I'm fine!",
        elapsedMsSincePreviousUser: 800,
      })
    ).toBe(true)

    expect(
      shouldCoalesceEngvoUserTranscript({
        previousUserText: 'Hello there',
        nextUserText: 'hello there.',
        elapsedMsSincePreviousUser: ENGVO_XAI_USER_COALESCE_WINDOW_MS - 1,
      })
    ).toBe(true)
  })

  it('does not coalesce outside the window or on empty/different text', () => {
    expect(
      shouldCoalesceEngvoUserTranscript({
        previousUserText: "I'm fine.",
        nextUserText: "I'm fine.",
        elapsedMsSincePreviousUser: ENGVO_XAI_USER_COALESCE_WINDOW_MS + 1,
      })
    ).toBe(false)

    expect(
      shouldCoalesceEngvoUserTranscript({
        previousUserText: "I'm fine.",
        nextUserText: 'Not bad.',
        elapsedMsSincePreviousUser: 200,
      })
    ).toBe(false)

    expect(
      shouldCoalesceEngvoUserTranscript({
        previousUserText: '',
        nextUserText: 'Hi',
        elapsedMsSincePreviousUser: 100,
      })
    ).toBe(false)
  })

  it('normalizes punctuation, case and contractions', () => {
    expect(normalizeEngvoUserTranscriptForCompare("I'm Fine!!!")).toBe('i am fine')
    expect(normalizeEngvoUserTranscriptForCompare('I am fine.')).toBe('i am fine')
  })
})
