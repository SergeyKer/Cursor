import { describe, expect, it } from 'vitest'
import { validateDialogueMixedInputOutput } from './dialogueMixedInputGuard'

describe('validateDialogueMixedInputOutput', () => {
  it('fails when mixed input has no mandatory comment/repeat protocol', () => {
    const res = validateDialogueMixedInputOutput({
      userText: 'I wisited Питер',
      content: 'What did you do yesterday?',
    })
    expect(res).toEqual({ ok: false, reason: 'missing_comment_or_repeat' })
  })

  it('fails when mixed input has only comment and no repeat', () => {
    const res = validateDialogueMixedInputOutput({
      userText: 'I wisited Питер',
      content: 'Комментарий: Нужно visited и St. Petersburg.',
    })
    expect(res).toEqual({ ok: false, reason: 'missing_comment_or_repeat' })
  })

  it('fails when repeat contains cyrillic in mixed input', () => {
    const res = validateDialogueMixedInputOutput({
      userText: 'I see лес',
      content: 'Комментарий: Нужен перевод.\nСкажи: I saw лес.',
    })
    expect(res).toEqual({ ok: false, reason: 'repeat_contains_cyrillic' })
  })

  it('fails when comment has no explicit translation for mixed input', () => {
    const res = validateDialogueMixedInputOutput({
      userText: 'I see лес',
      content: 'Комментарий: Тут ошибка слова.\nСкажи: I saw a forest.',
    })
    expect(res).toEqual({ ok: false, reason: 'missing_comment_translation' })
  })

  it('passes for mixed input with translation and english repeat', () => {
    const res = validateDialogueMixedInputOutput({
      userText: 'I wisited Питер',
      content: 'Комментарий: Питер = St. Petersburg, и нужно visited.\nСкажи: I visited St. Petersburg.',
    })
    expect(res).toEqual({ ok: true })
  })

  it('passes for mixed input with Повтори (dialogue protocol after normalization)', () => {
    const res = validateDialogueMixedInputOutput({
      userText: 'I have been triing блины',
      content:
        'Комментарий: блины = blini, исправьте trying.\nПовтори: I have been trying to make blini.',
    })
    expect(res).toEqual({ ok: true })
  })

  it('passes for mixed input with Комментарий_ошибка and Повтори', () => {
    const res = validateDialogueMixedInputOutput({
      userText: 'I see лес',
      content:
        'Комментарий_ошибка: лес = forest, нужен Past Simple.\nПовтори: I saw a forest.',
    })
    expect(res).toEqual({ ok: true })
  })

  it('does not interfere for non-mixed user input', () => {
    const res = validateDialogueMixedInputOutput({
      userText: 'I saw a forest',
      content: 'Комментарий: Отлично.\nСкажи: I saw a forest.',
    })
    expect(res).toEqual({ ok: true })
  })

  it('returns ok for cyrillic-only user text (not mixed Latin+Cyrillic)', () => {
    const res = validateDialogueMixedInputOutput({
      userText: 'я люблю блины',
      content: 'Комментарий: Отлично!\nWhat is your favorite food?',
    })
    expect(res).toEqual({ ok: true })
  })
})

