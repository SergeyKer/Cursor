import { describe, expect, it } from 'vitest'
import {
  hasTranslationSuccessProtocolFields,
  isTranslationJunkOnlyProtocolFields,
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

  it('returns junk_repeat when translationJunkRepeat is set', () => {
    expect(
      resolveTranslationProtocolStatus({
        mode: 'translation',
        translationSuccessShape: true,
        translationErrorCoachUi: true,
        translationJunkRepeat: true,
      })
    ).toBe('junk_repeat')
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

  it('prioritizes structural error fields over praise-like comment', () => {
    expect(
      resolveTranslationProtocolStatusFromFields({
        comment: 'Отлично, хорошее начало.',
        commentIsPraise: true,
        errorsBlock: '🔤 Нужно исправить форму глагола.',
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

  it('keeps success for neutral-positive comment without structural error fields', () => {
    expect(
      resolveTranslationProtocolStatusFromFields({
        comment: 'Хороший ответ по смыслу и по форме.',
        commentIsPraise: false,
        repeat: null,
        repeatRu: null,
      })
    ).toBe('success')
  })

  it('returns junk_repeat for Комментарий_мусор + Скажи without error blocks', () => {
    expect(
      resolveTranslationProtocolStatusFromFields({
        comment: null,
        translationSupportComment: null,
        translationJunkComment: 'Нужен ответ на английском.',
        errorsBlock: null,
        repeat: 'I read books.',
        repeatRu: 'I read books.',
      })
    ).toBe('junk_repeat')
  })

  it('does not return junk_repeat when Ошибки block is present', () => {
    expect(
      resolveTranslationProtocolStatusFromFields({
        comment: null,
        translationSupportComment: null,
        translationJunkComment: 'Что-то похожее на мусор.',
        errorsBlock: '🔤 Ошибка.',
        repeat: 'I read.',
        repeatRu: null,
      })
    ).toBe('error_repeat')
  })

  it('does not classify as success when praise comment still has repeat line', () => {
    expect(
      resolveTranslationProtocolStatusFromFields({
        comment: 'Отлично! Почти верно.',
        commentIsPraise: true,
        errorsBlock: null,
        repeat: 'I went to the park yesterday.',
        repeatRu: null,
      })
    ).toBe('error_repeat')
  })

  it('falls back to prompt_only when success fields are incomplete', () => {
    expect(
      resolveTranslationProtocolStatusFromFields({
        comment: null,
        commentIsPraise: true,
        errorsBlock: null,
        repeat: null,
        repeatRu: null,
      })
    ).toBe('prompt_only')
  })
})

describe('isTranslationJunkOnlyProtocolFields', () => {
  it('is true only for junk + repeat without comment/support/errors', () => {
    expect(
      isTranslationJunkOnlyProtocolFields({
        comment: null,
        translationJunkComment: 'Мусор.',
        translationSupportComment: null,
        errorsBlock: null,
        repeat: 'Say it.',
        repeatRu: null,
      })
    ).toBe(true)
  })

  it('is false when Комментарий is present', () => {
    expect(
      isTranslationJunkOnlyProtocolFields({
        comment: 'Ошибка времени.',
        translationJunkComment: 'Мусор.',
        errorsBlock: null,
        translationSupportComment: null,
        repeat: 'I run.',
        repeatRu: null,
      })
    ).toBe(false)
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
