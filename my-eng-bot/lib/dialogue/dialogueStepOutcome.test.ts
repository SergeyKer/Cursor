import { describe, expect, it } from 'vitest'
import { resolveDialogueStepAward } from '@/lib/dialogue/dialogueStepOutcome'

describe('resolveDialogueStepAward', () => {
  it('awards success on eligible next-question advance', () => {
    const award = resolveDialogueStepAward({
      dialogueCorrect: true,
      assistantContent: 'What did you do yesterday?',
      userContent: 'I played football.',
      prevAssistantContent: 'How are you today?',
    })
    expect(award?.outcome).toBe('success')
    expect(award?.assistantKey.startsWith('d:')).toBe(true)
  })

  it('awards recovered when previous assistant had Повтори', () => {
    const award = resolveDialogueStepAward({
      dialogueCorrect: true,
      assistantContent: 'Where do you live?',
      userContent: 'I live in Moscow.',
      prevAssistantContent: 'Комментарий: Нужен Past Simple.\nПовтори: I played football.',
    })
    expect(award?.outcome).toBe('recovered')
  })

  it('ignores freeze / incorrect', () => {
    expect(
      resolveDialogueStepAward({
        dialogueCorrect: false,
        assistantContent: 'Комментарий: Ошибка.\nПовтори: I went home.',
        userContent: 'I go home.',
      })
    ).toBeNull()
  })

  it('ignores topic-switch refusal meta', () => {
    expect(
      resolveDialogueStepAward({
        dialogueCorrect: true,
        assistantContent:
          'Good idea. In this lesson we stay on the current topic. Please answer about this topic, or switch to Free Topic to change it.',
        userContent: 'Can we talk about movies?',
      })
    ).toBeNull()
  })

  it('ignores content without a next question', () => {
    expect(
      resolveDialogueStepAward({
        dialogueCorrect: true,
        assistantContent: 'Great job.',
        userContent: 'Thanks',
      })
    ).toBeNull()
  })
})
