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

  it('ignores free-text topic lock when prev is invite', () => {
    expect(
      resolveDialogueStepAward({
        dialogueCorrect: true,
        assistantContent: 'What sports do you like?',
        userContent: 'sports',
        prevAssistantContent: 'What would you like to talk about?',
      })
    ).toBeNull()
  })

  it('ignores topic lock when prev invite has warmup line', () => {
    expect(
      resolveDialogueStepAward({
        dialogueCorrect: true,
        assistantContent: 'What do you usually watch?',
        userContent: 'films',
        prevAssistantContent:
          '📖 Сначала задам 1–3 коротких вопроса, чтобы собрать контекст, затем перейдем к заданиям в выбранном времени.\nWhat would you like to talk about?',
      })
    ).toBeNull()
  })

  it('ignores numbered topic choice when prev has menu', () => {
    expect(
      resolveDialogueStepAward({
        dialogueCorrect: true,
        assistantContent: 'What films do you like?',
        userContent: '2',
        prevAssistantContent:
          'What would you like to talk about?\nYour topic, or one of these:\n1) films\n2) work\n3) travel',
      })
    ).toBeNull()
  })

  it('ignores when current assistant re-asks topic invite', () => {
    expect(
      resolveDialogueStepAward({
        dialogueCorrect: true,
        assistantContent: 'What do you want to talk about?',
        userContent: 'asdf',
        prevAssistantContent: 'What do you want to talk about?',
      })
    ).toBeNull()
  })

  it('awards after content question once topic is locked', () => {
    const award = resolveDialogueStepAward({
      dialogueCorrect: true,
      assistantContent: 'How often do you play?',
      userContent: 'I play football every week.',
      prevAssistantContent: 'What sports do you like?',
    })
    expect(award?.outcome).toBe('success')
  })

  it('does not treat past drill "talk about yesterday" as topic solicitation', () => {
    const award = resolveDialogueStepAward({
      dialogueCorrect: true,
      assistantContent: 'Who did you talk to?',
      userContent: 'I talked about school yesterday.',
      prevAssistantContent: 'What did you talk about yesterday?',
    })
    expect(award?.outcome).toBe('success')
  })

  it('does not treat mid-session "talk about next" as topic solicitation', () => {
    const award = resolveDialogueStepAward({
      dialogueCorrect: true,
      assistantContent: 'What will you do tomorrow?',
      userContent: 'I will rest.',
      prevAssistantContent: 'What would you like to talk about next?',
    })
    expect(award?.outcome).toBe('success')
  })

  it('ignores domain clarification meta for short answers', () => {
    expect(
      resolveDialogueStepAward({
        dialogueCorrect: true,
        assistantContent: 'Did you mean the bank or the river bank?',
        userContent: 'bank',
        prevAssistantContent: 'Where do you work?',
      })
    ).toBeNull()
  })
})
