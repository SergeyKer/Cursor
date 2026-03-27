import { describe, expect, it } from 'vitest'
import { validateDialogueRussianNaturalness } from './dialogueRussianNaturalness'

describe('validateDialogueRussianNaturalness', () => {
  it('rejects an awkward Russian calque in dialogue mode', () => {
    expect(
      validateDialogueRussianNaturalness({
        content: 'Комментарий: Вы уже пробовали море?\nWhat did you do there?',
        mode: 'dialogue',
      })
    ).toEqual({ ok: false, reason: 'russian_naturalness_mismatch' })
  })

  it('rejects nearby sea-related calques too', () => {
    expect(
      validateDialogueRussianNaturalness({
        content: 'Комментарий: Вы уже ходили море?\nWhat did you do there?',
        mode: 'dialogue',
      })
    ).toEqual({ ok: false, reason: 'russian_naturalness_mismatch' })
  })

  it('accepts a natural Russian comment in dialogue mode', () => {
    expect(
      validateDialogueRussianNaturalness({
        content: 'Комментарий: Вы уже были на море?\nWhat did you do there?',
        mode: 'dialogue',
      })
    ).toEqual({ ok: true })
  })

  it('does not affect other modes', () => {
    expect(
      validateDialogueRussianNaturalness({
        content: 'Комментарий: Вы уже пробовали море?\nWhat did you do there?',
        mode: 'translation',
      })
    ).toEqual({ ok: true })
  })
})
