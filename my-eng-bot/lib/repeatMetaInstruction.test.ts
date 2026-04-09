import { describe, expect, it } from 'vitest'
import {
  extractFirstRepeatEnglishBody,
  isRepeatLineMetaInstruction,
  sanitizeRepeatMetaInstructionInContent,
} from './repeatMetaInstruction'

describe('isRepeatLineMetaInstruction', () => {
  it('detects tutor meta about Repeat section', () => {
    expect(
      isRepeatLineMetaInstruction(
        `Let's check the example in the "Repeat" section for any grammar mistakes.`
      )
    ).toBe(true)
  })

  it('does not flag normal drill sentences', () => {
    expect(isRepeatLineMetaInstruction('I love watching cartoons.')).toBe(false)
    expect(isRepeatLineMetaInstruction('I usually cook pasta for dinner.')).toBe(false)
  })

  it('detects grammar explanation masquerading as Повтори', () => {
    expect(
      isRepeatLineMetaInstruction(
        `The term 'a salad' usually implies a single action, while 'salad' is better suited for habits.`
      )
    ).toBe(true)
  })
})

describe('sanitizeRepeatMetaInstructionInContent', () => {
  it('replaces meta Повтори with prior English line', () => {
    const content = `Комментарий: Лексическая ошибка.
Повтори: Let's check the example in the "Repeat" section for any grammar mistakes.`
    const out = sanitizeRepeatMetaInstructionInContent(content, 'I love watching cartoons.')
    expect(out).toContain('Повтори: I love watching cartoons.')
    expect(out.toLowerCase()).not.toContain('repeat section')
  })

  it('leaves valid repeat unchanged', () => {
    const content = `Комментарий: Ошибка.
Повтори: I love watching cartoons.`
    const out = sanitizeRepeatMetaInstructionInContent(content, 'I love watching cartoons.')
    expect(out).toBe(content)
  })
})

describe('extractFirstRepeatEnglishBody', () => {
  it('reads Повтори body with optional bullet prefix', () => {
    const content = '1) Повтори: Hello there.'
    expect(extractFirstRepeatEnglishBody(content)).toBe('Hello there.')
  })
})
