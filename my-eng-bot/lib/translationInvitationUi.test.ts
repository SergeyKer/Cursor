import { describe, expect, it } from 'vitest'
import { isGenericTranslationMetaInvitation, splitTranslationInvitation } from './translationInvitationUi'

describe('splitTranslationInvitation', () => {
  it('не обрезает задание на первой точке после «Теперь.»', () => {
    const text =
      'Прочитай вслух.\nПереведи далее: Теперь. Я люблю играть с друзьями по вечерам.'
    const { invitation, mainAfter } = splitTranslationInvitation(text)
    expect(invitation).toContain('Теперь')
    expect(invitation).toContain('Я люблю играть')
    expect(mainAfter).toBe('')
  })

  it('находит «Переведи на английский.» без двоеточия', () => {
    const text = 'Формы:\n+: A.\nПереведи на английский язык.'
    const { invitation, mainAfter } = splitTranslationInvitation(text)
    expect(invitation).toMatch(/Переведи на английский(?: язык)?/i)
    expect(mainAfter).toBe('')
  })

  it('находит «Переведи далее: …», если строка начинается с приглашения', () => {
    const text = 'Переведи далее: Я читаю книгу.'
    const { mainBefore, invitation, mainAfter } = splitTranslationInvitation(text)
    expect(mainBefore).toBe('')
    expect(invitation).toBe('Переведи далее: Я читаю книгу.')
    expect(mainAfter).toBe('')
  })

  it('находит «Переведи на английский.» в начале текста', () => {
    const text = 'Переведи на английский язык.'
    const { mainBefore, invitation, mainAfter } = splitTranslationInvitation(text)
    expect(mainBefore).toBe('')
    expect(invitation).toMatch(/Переведи на английский(?: язык)?/i)
    expect(mainAfter).toBe('')
  })
})

describe('isGenericTranslationMetaInvitation', () => {
  it('распознаёт служебную строку протокола', () => {
    expect(isGenericTranslationMetaInvitation('Переведи на английский язык.')).toBe(true)
    expect(isGenericTranslationMetaInvitation('  Переведи на английский.  ')).toBe(true)
  })

  it('не считает служебной строку с заданием после двоеточия', () => {
    expect(isGenericTranslationMetaInvitation('Переведи далее: Я читаю книгу.')).toBe(false)
  })
})
