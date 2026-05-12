import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from './route'

describe('buildSystemPrompt communication mix learning rule', () => {
  it('adds mix learning rule for communication mix mode', () => {
    const systemPrompt = buildSystemPrompt({
      mode: 'communication',
      sentenceType: 'mixed',
      topic: 'free_talk',
      level: 'a2',
      tense: 'present_simple',
      audience: 'adult',
      communicationLanguageHint: 'English',
      communicationVoiceInputMode: 'mix',
    })

    expect(systemPrompt).toContain('Mix mode learning rule (strict): ALWAYS reply in English only')
    expect(systemPrompt).toContain('For longer or denser Russian input')
    expect(systemPrompt).toContain('one concise natural English paraphrase of the main meaning')
  })

  it('does not add mix learning rule outside mix mode', () => {
    const systemPrompt = buildSystemPrompt({
      mode: 'communication',
      sentenceType: 'mixed',
      topic: 'free_talk',
      level: 'a2',
      tense: 'present_simple',
      audience: 'adult',
      communicationLanguageHint: 'Russian',
      communicationVoiceInputMode: 'ru',
    })

    expect(systemPrompt).not.toContain('Mix mode learning rule (strict): ALWAYS reply in English only')
  })
})
