import { describe, expect, it } from 'vitest'
import {
  collectCandidateEnglishQuestionLines,
  inferTenseFromDialogueAssistantContent,
  isUserLikelyCorrectForTense,
  looksLikeEnglishQuestionWithoutMark,
} from './dialogueTenseInference'

describe('looksLikeEnglishQuestionWithoutMark', () => {
  it('accepts wh-question without question mark', () => {
    expect(looksLikeEnglishQuestionWithoutMark('What do you usually do in the sun')).toBe(true)
  })
  it('rejects statement', () => {
    expect(looksLikeEnglishQuestionWithoutMark('I usually swim in the pool.')).toBe(false)
  })
})

describe('inferTenseFromDialogueAssistantContent', () => {
  it('infers Present Simple from standard question', () => {
    expect(inferTenseFromDialogueAssistantContent('What do you usually do in the sun?')).toBe('present_simple')
  })

  it('infers Present Simple when question mark omitted', () => {
    expect(inferTenseFromDialogueAssistantContent('What do you usually do in the sun')).toBe('present_simple')
  })

  it('infers Past Continuous', () => {
    expect(
      inferTenseFromDialogueAssistantContent('What were you doing when you were sunbathing?')
    ).toBe('past_continuous')
  })

  it('prefers English question over Повтори line in same message', () => {
    const mixed = [
      'Комментарий: something',
      'Повтори: I will have played football by the end of the year.',
      'What do you usually do for exercise?',
    ].join('\n')
    expect(inferTenseFromDialogueAssistantContent(mixed)).toBe('present_simple')
  })

  it('collectCandidateEnglishQuestionLines orders ? lines then no-?', () => {
    const lines = collectCandidateEnglishQuestionLines(
      'What do you usually do in the sun\nWhat will you do tomorrow?'
    )
    expect(lines[0]).toContain('tomorrow')
  })

  it('infers Future Perfect from "will you have done" question', () => {
    expect(
      inferTenseFromDialogueAssistantContent('What will you have done by the end of your time at the sea?')
    ).toBe('future_perfect')
  })

  it('infers Future Perfect Continuous from "will you have been" question', () => {
    expect(
      inferTenseFromDialogueAssistantContent('How long will you have been swimming by the time you finish?')
    ).toBe('future_perfect_continuous')
  })
})

describe('isUserLikelyCorrectForTense', () => {
  // Future Perfect vs Future Perfect Continuous
  it('accepts "I will have swum" as future_perfect', () => {
    expect(isUserLikelyCorrectForTense('I will have swum', 'future_perfect')).toBe(true)
  })
  it('rejects "I will have been swimming" as future_perfect', () => {
    expect(isUserLikelyCorrectForTense('I will have been swimming', 'future_perfect')).toBe(false)
  })
  it('accepts "I will have been swimming" as future_perfect_continuous', () => {
    expect(isUserLikelyCorrectForTense('I will have been swimming', 'future_perfect_continuous')).toBe(true)
  })
  it('rejects "I will have swum" as future_perfect_continuous', () => {
    expect(isUserLikelyCorrectForTense('I will have swum', 'future_perfect_continuous')).toBe(false)
  })

  // Present Perfect vs Present Perfect Continuous
  it('accepts "I have visited Paris" as present_perfect', () => {
    expect(isUserLikelyCorrectForTense('I have visited Paris', 'present_perfect')).toBe(true)
  })
  it('rejects "I have been swimming" as present_perfect', () => {
    expect(isUserLikelyCorrectForTense('I have been swimming', 'present_perfect')).toBe(false)
  })
  it('accepts "I have been swimming" as present_perfect_continuous', () => {
    expect(isUserLikelyCorrectForTense('I have been swimming', 'present_perfect_continuous')).toBe(true)
  })

  // Past Perfect vs Past Perfect Continuous
  it('accepts "I had finished" as past_perfect', () => {
    expect(isUserLikelyCorrectForTense('I had finished', 'past_perfect')).toBe(true)
  })
  it('rejects "I had been swimming" as past_perfect', () => {
    expect(isUserLikelyCorrectForTense('I had been swimming', 'past_perfect')).toBe(false)
  })
  it('accepts "I had been swimming" as past_perfect_continuous', () => {
    expect(isUserLikelyCorrectForTense('I had been swimming', 'past_perfect_continuous')).toBe(true)
  })

  // Future Simple не должен принимать Future Perfect
  it('rejects "I will have done" as future_simple', () => {
    expect(isUserLikelyCorrectForTense('I will have done it', 'future_simple')).toBe(false)
  })
  it('accepts "I will swim" as future_simple', () => {
    expect(isUserLikelyCorrectForTense('I will swim tomorrow', 'future_simple')).toBe(true)
  })
})
