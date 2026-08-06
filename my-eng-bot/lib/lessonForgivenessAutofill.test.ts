import { describe, expect, it } from 'vitest'
import {
  shouldFireLessonChoiceAutoSelect,
  shouldFireLessonTextAutofill,
} from '@/lib/lessonForgivenessAutofill'

describe('shouldFireLessonChoiceAutoSelect', () => {
  it('fires once for a fresh nonce after Continue remount (consumed null)', () => {
    expect(
      shouldFireLessonChoiceAutoSelect({
        disabled: false,
        autoSelectText: 'am',
        autoSelectNonce: 1,
        consumedNonce: null,
      }),
    ).toBe(true)
  })

  it('does not re-fire the same nonce on disabled/choices flip', () => {
    expect(
      shouldFireLessonChoiceAutoSelect({
        disabled: false,
        autoSelectText: 'am',
        autoSelectNonce: 1,
        consumedNonce: 1,
      }),
    ).toBe(false)
  })

  it('skips while disabled or without text/nonce', () => {
    expect(
      shouldFireLessonChoiceAutoSelect({
        disabled: true,
        autoSelectText: 'am',
        autoSelectNonce: 1,
        consumedNonce: null,
      }),
    ).toBe(false)
    expect(
      shouldFireLessonChoiceAutoSelect({
        disabled: false,
        autoSelectText: null,
        autoSelectNonce: 1,
        consumedNonce: null,
      }),
    ).toBe(false)
    expect(
      shouldFireLessonChoiceAutoSelect({
        disabled: false,
        autoSelectText: 'am',
        autoSelectNonce: 0,
        consumedNonce: null,
      }),
    ).toBe(false)
  })

  it('fires again only when nonce advances', () => {
    expect(
      shouldFireLessonChoiceAutoSelect({
        disabled: false,
        autoSelectText: 'is',
        autoSelectNonce: 2,
        consumedNonce: 1,
      }),
    ).toBe(true)
  })
})

describe('shouldFireLessonTextAutofill', () => {
  it('fires once per nonce', () => {
    expect(
      shouldFireLessonTextAutofill({
        autofillAnswer: "I'm happy.",
        autofillNonce: 1,
        consumedNonce: 0,
      }),
    ).toBe(true)
    expect(
      shouldFireLessonTextAutofill({
        autofillAnswer: "I'm happy.",
        autofillNonce: 1,
        consumedNonce: 1,
      }),
    ).toBe(false)
  })

  it('skips empty answer or zero nonce', () => {
    expect(
      shouldFireLessonTextAutofill({
        autofillAnswer: null,
        autofillNonce: 1,
        consumedNonce: 0,
      }),
    ).toBe(false)
    expect(
      shouldFireLessonTextAutofill({
        autofillAnswer: "I'm happy.",
        autofillNonce: 0,
        consumedNonce: 0,
      }),
    ).toBe(false)
  })
})
