import { describe, expect, it } from 'vitest'
import {
  buildBrokenPhraseFromTarget,
  extractErrorFixBrokenPhrase,
  extractSituationKeyFromErrorFixPrompt,
  isErrorFixBrokenValid,
} from '@/lib/practice/prompt/errorFixBrokenPhrase'
import { errorFixPromptHasContext, formatErrorFixPrompt } from '@/lib/practice/prompt/buildErrorFixPrompt'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('errorFixBrokenPhrase', () => {
  it('rejects contraction-only and missing-is traps', () => {
    expect(isErrorFixBrokenValid('It dark.', "It's dark.")).toBe(false)
    expect(isErrorFixBrokenValid('It is dark.', "It's dark.")).toBe(false)
  })

  it('accepts wrong content word', () => {
    expect(isErrorFixBrokenValid("It's cold.", "It's dark.")).toBe(true)
  })

  it('builds a valid broken phrase for lesson 1', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const broken = buildBrokenPhraseFromTarget("It's dark.", lesson!)
    expect(broken).toBeTruthy()
    expect(isErrorFixBrokenValid(broken!, "It's dark.")).toBe(true)
  })

  it('extracts broken and situation key from prompt', () => {
    const prompt = formatErrorFixPrompt('Ситуация: На улице темно.', "It's cold.")
    expect(errorFixPromptHasContext(prompt)).toBe(true)
    expect(extractErrorFixBrokenPhrase(prompt)).toBe("It's cold.")
    expect(extractSituationKeyFromErrorFixPrompt(prompt)).toContain('темно')
  })
})
