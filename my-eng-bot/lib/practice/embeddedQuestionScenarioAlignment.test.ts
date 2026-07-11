import { describe, expect, it } from 'vitest'
import {
  embeddedErrorFixPairIsAligned,
  embeddedRoleplayInterlocutorOk,
  embeddedScenarioRuEnAligned,
  embeddedTargetHasBadInversion,
  isRecipeAnswerHint,
  situationRuIsTranslateLeak,
} from '@/lib/practice/embeddedQuestionScenarioAlignment'

describe('embeddedQuestionScenarioAlignment', () => {
  it('detects bad embedded inversion', () => {
    expect(embeddedTargetHasBadInversion('I know what does she like.')).toBe(true)
    expect(embeddedTargetHasBadInversion('I know what she likes.')).toBe(false)
  })

  it('checks RU EN alignment smoke', () => {
    expect(embeddedScenarioRuEnAligned('Я знаю, что ей нравится.', 'I know what she likes.')).toBe(true)
    expect(embeddedScenarioRuEnAligned('Разговор о её вкусах.', 'I know what she likes.')).toBe(true)
    expect(embeddedScenarioRuEnAligned('Нужно сказать, что адрес неизвестен.', "I don't know where he lives.")).toBe(
      true
    )
    expect(embeddedScenarioRuEnAligned('Я знаю, что ей нравится.', 'Tell me where Anna works.')).toBe(false)
  })

  it('accepts embedded roleplay interlocutor', () => {
    expect(embeddedRoleplayInterlocutorOk('Do you know who he is?')).toBe(true)
    expect(embeddedRoleplayInterlocutorOk('Where does Anna work?')).toBe(false)
  })

  it('aligns error-fix pairs for lesson 3', () => {
    expect(embeddedErrorFixPairIsAligned('Я знаю, что ей нужно.', 'I know what she wants.')).toBe(true)
    expect(embeddedErrorFixPairIsAligned('Фраза о её нужде звучит с ошибкой.', 'I know what she wants.')).toBe(
      true
    )
    expect(embeddedErrorFixPairIsAligned('Я знаю, что ей нравится.', 'Tell me where Anna works.')).toBe(false)
  })

  it('detects recipe answer hints', () => {
    expect(isRecipeAnswerHint('Tell me + what + she + likes.')).toBe(true)
    expect(isRecipeAnswerHint('who + he + is')).toBe(true)
    expect(isRecipeAnswerHint('Выберите слово для пропуска.')).toBe(false)
    expect(isRecipeAnswerHint(undefined)).toBe(false)
  })

  it('detects translate-style situation leaks', () => {
    expect(
      situationRuIsTranslateLeak('Я знаю, что ей нравится.', 'I know what she likes.', 'choice')
    ).toBe(true)
    expect(
      situationRuIsTranslateLeak('Разговор о её вкусах.', 'I know what she likes.', 'choice')
    ).toBe(false)
    expect(
      situationRuIsTranslateLeak('Я не знаю, кто он.', "I don't know who he is.", 'free-response')
    ).toBe(false)
  })
})
