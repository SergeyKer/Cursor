import { describe, expect, it } from 'vitest'
import { splitEngvoAssistantRepeatCue } from '@/lib/engvo/assistantRepeatCue'

describe('splitEngvoAssistantRepeatCue', () => {
  it('splits newline Say (B1+)', () => {
    const r = splitEngvoAssistantRepeatCue(
      'Close — so: along the path — not: on a trail.\nSay: "We walk along the path to the river."'
    )
    expect(r).not.toBeNull()
    expect(r!.marker).toBe('Say')
    expect(r!.correction).toBe('Close — so: along the path — not: on a trail.')
    expect(r!.repeatText).toBe('We walk along the path to the river.')
  })

  it('splits newline Скажи (A1/A2)', () => {
    const r = splitEngvoAssistantRepeatCue(
      'Почти — так: a cat — не так: cat.\nСкажи: I have a cat.'
    )
    expect(r).not.toBeNull()
    expect(r!.marker).toBe('Скажи')
    expect(r!.correction).toBe('Почти — так: a cat — не так: cat.')
    expect(r!.repeatText).toBe('I have a cat.')
  })

  it('splits inline Say (screenshot-style one line)', () => {
    const r = splitEngvoAssistantRepeatCue(
      'Close — so: along the path to the river — not: on a trail to toward to the sea. Say: We walk along the path to the river.'
    )
    expect(r).not.toBeNull()
    expect(r!.marker).toBe('Say')
    expect(r!.correction).toMatch(/Close — so:/)
    expect(r!.correction).not.toMatch(/\bSay\b/i)
    expect(r!.repeatText).toBe('We walk along the path to the river.')
  })

  it('splits inline Скажи', () => {
    const r = splitEngvoAssistantRepeatCue('Почти — так: a cat — не так: cat. Скажи: I have a cat.')
    expect(r).not.toBeNull()
    expect(r!.marker).toBe('Скажи')
    expect(r!.correction).toBe('Почти — так: a cat — не так: cat.')
    expect(r!.repeatText).toBe('I have a cat.')
  })

  it('marker-only Say → empty correction', () => {
    const r = splitEngvoAssistantRepeatCue('Say: We have been to the hotel.')
    expect(r).toEqual({
      correction: '',
      marker: 'Say',
      repeatText: 'We have been to the hotel.',
    })
  })

  it('marker-only Скажи → empty correction', () => {
    const r = splitEngvoAssistantRepeatCue('Скажи: I go to the sea.')
    expect(r).toEqual({
      correction: '',
      marker: 'Скажи',
      repeatText: 'I go to the sea.',
    })
  })

  it('strips **Say:** markdown wrappers at parse time', () => {
    const r = splitEngvoAssistantRepeatCue('Close — so: shower — not: shower.\n**Say:** I have just had a shower.')
    expect(r!.marker).toBe('Say')
    expect(r!.repeatText).toBe('I have just had a shower.')
  })

  it('strips **Скажи:** markdown wrappers at parse time', () => {
    const r = splitEngvoAssistantRepeatCue('Почти.\n**Скажи:** I have a cat.')
    expect(r!.marker).toBe('Скажи')
    expect(r!.repeatText).toBe('I have a cat.')
  })

  it('takes next line when marker body is empty', () => {
    const r = splitEngvoAssistantRepeatCue('Close — so: sea — not: the sea.\nSay:\nI go to the sea.')
    expect(r!.marker).toBe('Say')
    expect(r!.repeatText).toBe('I go to the sea.')
    expect(r!.correction).toContain('Close')
  })

  it('returns null without marker', () => {
    expect(splitEngvoAssistantRepeatCue('Natural. Завтра пляж пустой. Translate into English.')).toBeNull()
    expect(splitEngvoAssistantRepeatCue('')).toBeNull()
  })
})
