import { describe, expect, it } from 'vitest'
import { isDialogueOutputLikelyInRequiredTense } from './dialogueOutputValidation'

describe('isDialogueOutputLikelyInRequiredTense', () => {
  it('Комментарий + вопрос в Past Simple: при requiredTense present_simple без expectedNext — несовпадение', () => {
    const content =
      'Комментарий: Отлично!\nWhat did you do at the beach last summer?'
    expect(
      isDialogueOutputLikelyInRequiredTense({
        content,
        requiredTense: 'present_simple',
        priorAssistantContent: null,
      })
    ).toBe(false)
  })

  it('тот же текст: при expectedNextQuestionTense past_simple — валидно', () => {
    const content =
      'Комментарий: Отлично!\nWhat did you do at the beach last summer?'
    expect(
      isDialogueOutputLikelyInRequiredTense({
        content,
        requiredTense: 'present_simple',
        priorAssistantContent: null,
        expectedNextQuestionTense: 'past_simple',
      })
    ).toBe(true)
  })

  it('Повтори проверяется по requiredTense, expectedNext не подменяет', () => {
    const content = 'Комментарий: Ошибка.\nПовтори: I feel happy.'
    expect(
      isDialogueOutputLikelyInRequiredTense({
        content,
        requiredTense: 'present_simple',
        priorAssistantContent: null,
        expectedNextQuestionTense: 'past_simple',
      })
    ).toBe(true)
  })
})
