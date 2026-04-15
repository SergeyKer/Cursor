import { describe, expect, it } from 'vitest'
import { resolveTranslationProtocolStatus } from './translationProtocolStatus'

describe('resolveTranslationProtocolStatus', () => {
  it('returns prompt_only outside translation mode', () => {
    expect(
      resolveTranslationProtocolStatus({
        mode: 'dialogue',
        translationSuccessShape: true,
        translationErrorCoachUi: true,
      })
    ).toBe('prompt_only')
  })

  it('returns error_repeat when error coach is active', () => {
    expect(
      resolveTranslationProtocolStatus({
        mode: 'translation',
        translationSuccessShape: false,
        translationErrorCoachUi: true,
      })
    ).toBe('error_repeat')
  })

  it('returns success for successful translation response', () => {
    expect(
      resolveTranslationProtocolStatus({
        mode: 'translation',
        translationSuccessShape: true,
        translationErrorCoachUi: false,
      })
    ).toBe('success')
  })

  it('returns prompt_only for translation prompt without correction/result', () => {
    expect(
      resolveTranslationProtocolStatus({
        mode: 'translation',
        translationSuccessShape: false,
        translationErrorCoachUi: false,
      })
    ).toBe('prompt_only')
  })
})
