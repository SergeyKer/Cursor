import { describe, expect, it } from 'vitest'
import { splitTranslationInvitation } from './translationInvitationUi'

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
    const text = 'Формы:\n+: A.\nПереведи на английский.'
    const { invitation, mainAfter } = splitTranslationInvitation(text)
    expect(invitation).toMatch(/Переведи на английский/i)
    expect(mainAfter).toBe('')
  })
})
