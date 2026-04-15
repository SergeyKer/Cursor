import { describe, expect, it } from 'vitest'
import { compactDialogueComment, isExplicitExtraIssueSentence } from './dialogueCommentCompact'

describe('isExplicitExtraIssueSentence', () => {
  it('detects typo hint sentences', () => {
    expect(isExplicitExtraIssueSentence('Также опечатка: «x» → «y».')).toBe(true)
    expect(isExplicitExtraIssueSentence('Также опечатки: «a» → «b».')).toBe(true)
  })
})

describe('compactDialogueComment', () => {
  it('keeps typo sentence when it would be third after tense + reason', () => {
    const content = `Комментарий: Ошибка времени: нужно is. Здесь речь о факте. Также опечатка: «favorit» → «favorite».
Скажи: What is your favorite color.`
    const out = compactDialogueComment(content, 'adult')
    expect(out).toContain('Также опечатка')
    expect(out).toContain('favorit')
    expect(out).toContain('favorite')
    expect(out).toContain('Ошибка времени')
    expect(out).toContain('Здесь речь о факте')
  })

  it('still limits to two sentences when no preservation markers', () => {
    const content = `Комментарий: Первое предложение. Второе предложение. Третье без маркера.
Скажи: Ok.`
    const out = compactDialogueComment(content, 'adult')
    const body = out.match(/Комментарий:\s*(.+)/)?.[1] ?? ''
    const parts = body.split(/(?<=[.!?])\s+/).filter(Boolean)
    expect(parts.length).toBeLessThanOrEqual(2)
  })
})
