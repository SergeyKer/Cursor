import { describe, expect, it } from 'vitest'
import { enrichDialogueCommentWithTypoHints } from './dialogueCommentEnrichment'

describe('enrichDialogueCommentWithTypoHints', () => {
  it('appends spelling hints when comment only mentions tense', () => {
    const content = `Комментарий: В предложении неверное время. Нужно использовать Future Simple.
Повтори: I will enjoy English tomorrow.`
    const userText = 'yes I endjoy English tomorow'
    const out = enrichDialogueCommentWithTypoHints({ content, userText })
    expect(out).toContain('опечат')
    expect(out).toContain('endjoy')
    expect(out).toContain('enjoy')
    expect(out).toContain('tomorow')
    expect(out).toContain('tomorrow')
    expect(out.split('\n').length).toBe(2)
  })

  it('does not duplicate when comment already mentions spelling', () => {
    const content = `Комментарий: Неверное время и опечатки в словах.
Повтори: I will enjoy English tomorrow.`
    const userText = 'yes I endjoy English tomorow'
    const out = enrichDialogueCommentWithTypoHints({ content, userText })
    expect(out).toBe(content)
  })

  it('returns unchanged when no Повтори line', () => {
    const content = 'What will you do tomorrow?'
    expect(enrichDialogueCommentWithTypoHints({ content, userText: 'ok' })).toBe(content)
  })

  it('adds possessive hint when user wrote you instead of your', () => {
    const content = `Комментарий: Ошибка времени.
Повтори: What is your favorite color.`
    const userText = 'What was you favorit color'
    const out = enrichDialogueCommentWithTypoHints({ content, userText })
    expect(out).toContain('притяжательное')
    expect(out).toContain('your')
  })

  it('adds mixed-script hint for Russian word vs English in repeat', () => {
    const content = `Комментарий: Ошибка времени.
Повтори: What is your favorite color.`
    const userText = 'What was you favorit цвет'
    const out = enrichDialogueCommentWithTypoHints({ content, userText })
    expect(out).toContain('Русское')
    expect(out).toContain('цвет')
    expect(out).toContain('color')
  })
})
