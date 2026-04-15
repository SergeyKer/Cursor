import { describe, expect, it } from 'vitest'
import { normalizeDialogueCommentTerminology } from './dialogueCommentTerminology'

describe('normalizeDialogueCommentTerminology', () => {
  it('normalizes mixed ru-en grammar terms in comment', () => {
    const input =
      'Комментарий: Здесь ошибка с tense и статей.\nСкажи: I have learned that the sun is very bright.'
    const output = normalizeDialogueCommentTerminology(input)
    expect(output).toContain('Комментарий: Здесь ошибка со временем и артиклями.')
    expect(output).toContain('Скажи: I have learned that the sun is very bright.')
  })

  it('does not modify content without comment line', () => {
    const input = 'What have you learned recently?'
    expect(normalizeDialogueCommentTerminology(input)).toBe(input)
  })
})
