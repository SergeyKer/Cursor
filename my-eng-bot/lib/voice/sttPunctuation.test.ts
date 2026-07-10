import { describe, expect, it } from 'vitest'
import {
  applyLocalSttPunctuation,
  hasTerminalPunctuation,
  needsPunctuationPass,
  preserveWordsOnlyPunctuation,
  tokenizeForWordGuard,
  truncateForSttPunctuate,
  wordsIdentityEqual,
} from './sttPunctuation'

const SHORT_FIXTURE = 'hello my name is Sergey how are you'
const LONG_FIXTURE =
  "hello my name is Sergey how are you I am fine than you what are you doing now I'm watching TV on the TV"

function assertPunctuatedPreservingWords(input: string, output: string) {
  expect(hasTerminalPunctuation(output)).toBe(true)
  expect(tokenizeForWordGuard(output)).toEqual(tokenizeForWordGuard(input))
}

describe('sttPunctuation', () => {
  it('needs pass when there is no terminal punctuation', () => {
    expect(needsPunctuationPass('hello who are you')).toBe(true)
    expect(needsPunctuationPass('i lake to eat')).toBe(true)
  })

  it('skips pass when text is already punctuated', () => {
    expect(needsPunctuationPass('Hello! Who are you?')).toBe(false)
    expect(needsPunctuationPass('I am a student.')).toBe(false)
  })

  it('needs pass for long under-punctuated segments', () => {
    expect(
      needsPunctuationPass(
        'Hello. one two three four five six seven eight nine more words here'
      )
    ).toBe(true)
  })

  it('tokenizes words for identity guard', () => {
    expect(tokenizeForWordGuard("Hello! Who are you? I'm fine.")).toEqual([
      'hello',
      'who',
      'are',
      'you',
      "i'm",
      'fine',
    ])
  })

  it('accepts punctuation-only changes', () => {
    expect(wordsIdentityEqual('hello who are you', 'Hello! Who are you?')).toBe(true)
    expect(
      preserveWordsOnlyPunctuation('hello who are you i am a student', 'Hello! Who are you? I am a student.')
    ).toBe('Hello! Who are you? I am a student.')
  })

  it('rejects word rewrites for pedagogy', () => {
    expect(wordsIdentityEqual('I lake to eat', 'I like to eat.')).toBe(false)
    expect(preserveWordsOnlyPunctuation('I lake to eat', 'I like to eat.')).toBe('I lake to eat')
    expect(preserveWordsOnlyPunctuation('I am OK', 'Am I OK?')).toBe('I am OK')
  })

  it('truncates long payloads', () => {
    const long = 'a'.repeat(600)
    expect(truncateForSttPunctuate(long).length).toBe(500)
  })

  it('local punctuation preserves words on short fixture', () => {
    const out = applyLocalSttPunctuation(SHORT_FIXTURE)
    assertPunctuatedPreservingWords(SHORT_FIXTURE, out)
    expect(out).toContain('Sergey')
  })

  it('local punctuation preserves than on screenshot fixture', () => {
    const out = applyLocalSttPunctuation(LONG_FIXTURE)
    assertPunctuatedPreservingWords(LONG_FIXTURE, out)
    expect(out.toLowerCase()).toContain('than')
    expect(out.toLowerCase()).not.toContain('thank')
  })

  it('local punctuation keeps lake and adds terminal', () => {
    const input = 'i lake to eat'
    const out = applyLocalSttPunctuation(input)
    assertPunctuatedPreservingWords(input, out)
    expect(tokenizeForWordGuard(out)).toContain('lake')
  })
})
