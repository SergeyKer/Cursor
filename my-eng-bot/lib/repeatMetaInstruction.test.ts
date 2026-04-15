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

  it('detects grammar explanation masquerading as Скажи', () => {
    expect(
      isRepeatLineMetaInstruction(
        `The term 'a salad' usually implies a single action, while 'salad' is better suited for habits.`
      )
    ).toBe(true)
  })

  it('detects praise masquerading as Скажи', () => {
    expect(
      isRepeatLineMetaInstruction(
        `It's great that you started with the question 'Do you'.`
      )
    ).toBe(true)
  })
})

describe('sanitizeRepeatMetaInstructionInContent', () => {
  it('replaces meta Скажи with prior English line', () => {
    const content = `Комментарий: Лексическая ошибка.
Скажи: Let's check the example in the "Repeat" section for any grammar mistakes.`
    const out = sanitizeRepeatMetaInstructionInContent(content, 'I love watching cartoons.')
    expect(out).toContain('Скажи: I love watching cartoons.')
    expect(out.toLowerCase()).not.toContain('repeat section')
  })

  it('leaves valid repeat unchanged', () => {
    const content = `Комментарий: Ошибка.
Скажи: I love watching cartoons.`
    const out = sanitizeRepeatMetaInstructionInContent(content, 'I love watching cartoons.')
    expect(out).toBe(content)
  })
})

describe('extractFirstRepeatEnglishBody', () => {
  it('reads Скажи body with optional bullet prefix', () => {
    const content = '1) Скажи: Hello there.'
    expect(extractFirstRepeatEnglishBody(content)).toBe('Hello there.')
  })
})
