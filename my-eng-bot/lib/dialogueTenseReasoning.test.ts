import { describe, expect, it } from 'vitest'
import { enrichDialogueCommentWithLearningReason } from './dialogueTenseReasoning'

describe('enrichDialogueCommentWithLearningReason', () => {
  it('adds Present Perfect result nuance for adult', () => {
    const content = `Комментарий: Требуется Present Perfect, а не Present Simple.
Повтори: I have already finished my task.`
    const out = enrichDialogueCommentWithLearningReason({
      content,
      requiredTense: 'present_perfect',
      audience: 'adult',
      userText: 'I finish my task',
      repeatSentence: 'I have already finished my task.',
    })
    expect(out).toContain('результ')
    expect(out).toContain('Present Perfect')
  })

  it('adds duration nuance for Present Perfect Continuous', () => {
    const content = `Комментарий: Требуется Present Perfect Continuous, а не Present Simple.
Повтори: I have been learning for two hours.`
    const out = enrichDialogueCommentWithLearningReason({
      content,
      requiredTense: 'present_perfect_continuous',
      audience: 'adult',
      userText: 'I learn now',
      repeatSentence: 'I have been learning for two hours.',
    })
    expect(out).toContain('длитель')
  })

  it('uses simpler process wording for child in Present Continuous', () => {
    const content = `Комментарий: Требуется Present Continuous, а не Present Simple.
Повтори: I am drawing now.`
    const out = enrichDialogueCommentWithLearningReason({
      content,
      requiredTense: 'present_continuous',
      audience: 'child',
      userText: 'I draw',
      repeatSentence: 'I am drawing now.',
    })
    expect(out).toContain('прямо сейчас')
  })

  it('adds have/has agreement reason', () => {
    const content = `Комментарий: Ошибка согласования подлежащего и сказуемого.
Повтори: He has finished homework.`
    const out = enrichDialogueCommentWithLearningReason({
      content,
      requiredTense: 'present_perfect',
      audience: 'adult',
      userText: 'He have finished homework',
      repeatSentence: 'He has finished homework.',
    })
    expect(out).toContain('has')
    expect(out).toContain('he/she/it')
  })
})
