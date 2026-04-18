import { describe, expect, it } from 'vitest'
import {
  dialogueAssistantHasRepeatLine,
  findDialoguePinCandidateFromMessages,
  isDialogueRepeatPinCandidate,
} from './dialogueRepeatPin'

describe('isDialogueRepeatPinCandidate', () => {
  it('accepts a normal English sentence', () => {
    expect(isDialogueRepeatPinCandidate('I have been cooking for two hours.')).toBe(true)
  })
  it('rejects question-shaped repeat', () => {
    expect(isDialogueRepeatPinCandidate('Do you like cats?')).toBe(false)
  })
  it('rejects trailing bare digit', () => {
    expect(isDialogueRepeatPinCandidate('I have been cooking 2')).toBe(false)
  })
  it('rejects too-short phrase', () => {
    expect(isDialogueRepeatPinCandidate('Go home')).toBe(false)
  })
  it('rejects cyrillic in body', () => {
    expect(isDialogueRepeatPinCandidate('I see лес')).toBe(false)
  })
})

describe('findDialoguePinCandidateFromMessages', () => {
  it('returns first repeat after last assistant message without repeat', () => {
    const messages = [
      { role: 'assistant', content: 'What did you do?\nNo repeat here.' },
      { role: 'user', content: 'wrong' },
      {
        role: 'assistant',
        content: 'Комментарий: Ошибка.\nПовтори: I have been cooking for two hours.',
      },
      { role: 'user', content: 'I have been cooking 2 часа' },
      {
        role: 'assistant',
        content: 'Комментарий: Ещё раз.\nПовтори: I have been cooking 2.',
      },
    ]
    expect(findDialoguePinCandidateFromMessages(messages)).toBe('I have been cooking for two hours.')
  })

  it('returns null when no assistant without repeat exists', () => {
    const messages = [
      { role: 'assistant', content: 'Комментарий: A\nПовтори: One two three.' },
      { role: 'assistant', content: 'Комментарий: B\nПовтори: Four five six.' },
    ]
    expect(findDialoguePinCandidateFromMessages(messages)).toBeNull()
  })
})

describe('dialogueAssistantHasRepeatLine', () => {
  it('detects Повтори on second line', () => {
    expect(dialogueAssistantHasRepeatLine('Hello.\nПовтори: Test.')).toBe(true)
  })
  it('false for question only', () => {
    expect(dialogueAssistantHasRepeatLine('What is your name?')).toBe(false)
  })
})
