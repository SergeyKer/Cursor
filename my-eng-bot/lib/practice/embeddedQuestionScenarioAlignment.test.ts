import { describe, expect, it } from 'vitest'
import {
  embeddedErrorFixPairIsAligned,
  embeddedRoleplayInterlocutorOk,
  embeddedScenarioRuEnAligned,
  embeddedTargetHasBadInversion,
} from '@/lib/practice/embeddedQuestionScenarioAlignment'

describe('embeddedQuestionScenarioAlignment', () => {
  it('detects bad embedded inversion', () => {
    expect(embeddedTargetHasBadInversion('I know what does she like.')).toBe(true)
    expect(embeddedTargetHasBadInversion('I know what she likes.')).toBe(false)
  })

  it('checks RU EN alignment smoke', () => {
    expect(embeddedScenarioRuEnAligned('Я знаю, что ей нравится.', 'I know what she likes.')).toBe(true)
    expect(embeddedScenarioRuEnAligned('Я знаю, что ей нравится.', 'Tell me where Anna works.')).toBe(false)
  })

  it('accepts embedded roleplay interlocutor', () => {
    expect(embeddedRoleplayInterlocutorOk('Do you know who he is?')).toBe(true)
    expect(embeddedRoleplayInterlocutorOk('Where does Anna work?')).toBe(false)
  })

  it('aligns error-fix pairs for lesson 3', () => {
    expect(embeddedErrorFixPairIsAligned('Я знаю, что ей нужно.', 'I know what she wants.')).toBe(true)
    expect(embeddedErrorFixPairIsAligned('Я знаю, что ей нравится.', 'Tell me where Anna works.')).toBe(false)
  })
})
