import { describe, expect, it } from 'vitest'
import { isDialogueRepeatAcceptable, isRepeatLexicallyPlausible } from './dialogueRepeatValidator'

describe('isRepeatLexicallyPlausible', () => {
  it('rejects known coercion junk', () => {
    expect(isRepeatLexicallyPlausible('I will have hased the prepare.')).toBe(false)
    expect(isRepeatLexicallyPlausible('I wontn have car.')).toBe(false)
  })
})

describe('isDialogueRepeatAcceptable', () => {
  it('accepts a correct repeat in required tense', () => {
    expect(
      isDialogueRepeatAcceptable({
        repeatEnglish: 'I have been cooking for two hours.',
        userText: 'I have been cooking 2 часа',
        requiredTense: 'present_perfect_continuous',
        priorAssistantContent: 'What have you been cooking lately?',
      })
    ).toBe(true)
  })

  it('rejects semantic downgrade for intention construction', () => {
    expect(
      isDialogueRepeatAcceptable({
        repeatEnglish: 'I find my work.',
        userText: 'I plan to find my work.',
        requiredTense: 'present_simple',
        priorAssistantContent: 'What do you usually plan for your week?',
      })
    ).toBe(false)
  })

  it('rejects lexical junk even if surface tense looks plausible', () => {
    expect(
      isDialogueRepeatAcceptable({
        repeatEnglish: 'I will have hased the prepare.',
        userText: 'I will has prepare шашлык',
        requiredTense: 'future_perfect',
        priorAssistantContent: 'What special meals will you have prepared at your country house by the end of your visit?',
      })
    ).toBe(false)
  })
})
