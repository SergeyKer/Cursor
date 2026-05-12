import { describe, expect, it } from 'vitest'
import { buildCommunicationMixLearningRule } from '@/lib/communicationMixLearningRule'

describe('buildSystemPrompt communication mix learning rule', () => {
  it('adds mix learning rule for communication mix mode', () => {
    const systemPrompt = buildCommunicationMixLearningRule('mix')

    expect(systemPrompt).toContain('Mix mode learning rule (strict): ALWAYS reply in English only')
    expect(systemPrompt).toContain('For longer or denser Russian input')
    expect(systemPrompt).toContain('one concise natural English paraphrase of the main meaning')
  })

  it('does not add mix learning rule outside mix mode', () => {
    const systemPrompt = buildCommunicationMixLearningRule('ru')

    expect(systemPrompt).not.toContain('Mix mode learning rule (strict): ALWAYS reply in English only')
  })
})
