import { describe, expect, it } from 'vitest'
import {
  normalizeScriptBoundarySpaces,
  prepareEngvoAssistantRawText,
} from './assistantTranscriptText'

describe('normalizeScriptBoundarySpaces', () => {
  it('inserts space after punctuation before Cyrillic', () => {
    expect(normalizeScriptBoundarySpaces('drill.Вот так.')).toBe('drill. Вот так.')
  })

  it('inserts space on the screenshot glue case', () => {
    expect(
      normalizeScriptBoundarySpaces(
        "I see the scene. Let's lock this topic as daily routines and start the drill.Вот я иду по улице к своей машине."
      )
    ).toBe(
      "I see the scene. Let's lock this topic as daily routines and start the drill. Вот я иду по улице к своей машине."
    )
  })

  it('does not double spaces when already correct', () => {
    expect(normalizeScriptBoundarySpaces('already correct. Вот')).toBe('already correct. Вот')
  })

  it('inserts space between Latin and Cyrillic letters', () => {
    expect(normalizeScriptBoundarySpaces('GoodВот так.')).toBe('Good Вот так.')
  })
})

describe('prepareEngvoAssistantRawText', () => {
  it('trims and normalizes script boundaries', () => {
    expect(prepareEngvoAssistantRawText('  drill.Вот  ')).toBe('drill. Вот')
  })

  it('converts literal \\n to newlines then trims', () => {
    expect(prepareEngvoAssistantRawText('Hello.\\nВот.')).toBe('Hello.\nВот.')
  })
})
