import { describe, expect, it } from 'vitest'
import {
  hasTranslationSuccessProtocolFields,
  resolveTranslationProtocolStatus,
  resolveTranslationProtocolStatusFromFields,
} from './translationProtocolStatus'
import { computeTranslationGoldVerdict } from './translationVerdict'

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

describe('resolveTranslationProtocolStatusFromFields', () => {
  it('treats support and errors blocks as error_repeat even without repeat line', () => {
    expect(
      resolveTranslationProtocolStatusFromFields({
        comment: null,
        translationSupportComment: 'Есть хорошая основа.',
        errorsBlock: '🔤 Ошибка времени.',
        repeat: null,
        repeatRu: null,
      })
    ).toBe('error_repeat')
  })

  it('treats non-praise translation comment as error_repeat', () => {
    expect(
      resolveTranslationProtocolStatusFromFields({
        comment: 'Ошибка времени: нужен Present Simple.',
        commentIsPraise: false,
        repeat: null,
        repeatRu: null,
      })
    ).toBe('error_repeat')
  })

  it('treats praise comment without error fields as success', () => {
    expect(
      resolveTranslationProtocolStatusFromFields({
        comment: 'Отлично! Всё верно.',
        commentIsPraise: true,
        repeat: null,
        repeatRu: null,
      })
    ).toBe('success')
  })
})

describe('hasTranslationSuccessProtocolFields', () => {
  it('does not treat corrective comment without repeat as success', () => {
    expect(
      hasTranslationSuccessProtocolFields({
        comment: 'Ошибка времени: нужен Present Simple.',
        commentIsPraise: false,
        repeat: null,
        repeatRu: null,
      })
    ).toBe(false)
  })
})

describe('computeTranslationGoldVerdict', () => {
  it('rejects a too-short gold for a long Russian prompt', () => {
    expect(
      computeTranslationGoldVerdict({
        userText: 'I like',
        goldEnglish: 'I like',
        ruPrompt: 'Я люблю есть пиццу по выходным.',
      }).ok
    ).toBe(false)
  })
})
