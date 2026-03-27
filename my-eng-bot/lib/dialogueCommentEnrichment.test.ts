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
})
