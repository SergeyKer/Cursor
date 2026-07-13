import { describe, expect, it } from 'vitest'
import {
  buildBrokenPhraseFromTarget,
  errorFixPairIsAligned,
  errorFixPromptHasLeakMarkers,
  errorFixPromptLeaksTargetAnswer,
  extractErrorFixBrokenPhrase,
  extractSituationKeyFromErrorFixPrompt,
  inferErrorFixAxis,
  inferSituationAxis,
  isErrorFixBrokenSameAxis,
  isErrorFixBrokenValid,
  isErrorFixTargetComplete,
} from '@/lib/practice/prompt/errorFixBrokenPhrase'
import {
  errorFixPromptHasContext,
  formatErrorFixPrompt,
  isErrorFixAiPairValid,
} from '@/lib/practice/prompt/buildErrorFixPrompt'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('errorFixBrokenPhrase', () => {
  it('rejects contraction-only and missing-is traps', () => {
    expect(isErrorFixBrokenValid('It dark.', "It's dark.")).toBe(false)
    expect(isErrorFixBrokenValid('It is dark.', "It's dark.")).toBe(false)
  })

  it('accepts wrong content word on the same axis', () => {
    expect(isErrorFixBrokenValid("It's cold.", "It's dark.")).toBe(true)
    expect(isErrorFixBrokenValid("It's time to drink.", "It's time to sleep.")).toBe(true)
  })

  it('rejects cross-axis broken phrases', () => {
    expect(isErrorFixBrokenValid("It's time to sleep.", "It's dark.")).toBe(false)
    expect(isErrorFixBrokenValid("It's cold.", "It's time to sleep.")).toBe(false)
    expect(isErrorFixBrokenSameAxis("It's time to sleep.", "It's dark.")).toBe(false)
  })

  it('infers axes for lesson 1 pairs', () => {
    expect(inferErrorFixAxis("It's dark.")).toBe('state')
    expect(inferErrorFixAxis("It's time to sleep.")).toBe('action')
    expect(inferErrorFixAxis("It's time.")).toBe('action')
    expect(inferSituationAxis('На улице темно')).toBe('state')
    expect(inferSituationAxis('Пора спать')).toBe('action')
  })

  it('aligns situation with target for lesson 1 only', () => {
    expect(errorFixPairIsAligned('На улице темно', "It's dark.", '1')).toBe(true)
    expect(errorFixPairIsAligned('На улице темно', "It's time to sleep.", '1')).toBe(false)
    expect(errorFixPairIsAligned('Пора спать', "It's time to sleep.", '1')).toBe(true)
    expect(errorFixPairIsAligned('На улице темно', "It's time to sleep.", '2')).toBe(true)
  })

  it('rejects incomplete It\'s time targets on lesson 1', () => {
    expect(isErrorFixTargetComplete("It's time.", '1')).toBe(false)
    expect(isErrorFixTargetComplete("It's time to sleep.", '1')).toBe(true)
    expect(isErrorFixTargetComplete("It's time for dinner.", '1')).toBe(true)
    expect(isErrorFixTargetComplete("It's dark.", '1')).toBe(true)
  })

  it('detects leak markers and target leaks', () => {
    expect(errorFixPromptHasLeakMarkers('Переведите: test')).toBe(true)
    expect(errorFixPromptHasLeakMarkers('Ситуация: темно. Исправьте: "It\'s cold."')).toBe(false)
    const prompt = formatErrorFixPrompt('Ситуация: На улице темно.', "It's cold.")
    expect(errorFixPromptLeaksTargetAnswer(`${prompt} It's dark.`, "It's dark.")).toBe(true)
    expect(errorFixPromptLeaksTargetAnswer(prompt, "It's dark.")).toBe(false)
  })

  it('builds a valid broken phrase for lesson 1', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const broken = buildBrokenPhraseFromTarget("It's dark.", lesson!)
    expect(broken).toBeTruthy()
    expect(broken!).toMatch(/^It's\b/i)
    expect(broken!.toLowerCase()).not.toMatch(/\bsleep\b/)
    expect(isErrorFixBrokenValid(broken!, "It's dark.")).toBe(true)
  })

  it('extracts broken and situation key from prompt', () => {
    const prompt = formatErrorFixPrompt('Ситуация: На улице темно.', "It's cold.")
    expect(errorFixPromptHasContext(prompt)).toBe(true)
    expect(extractErrorFixBrokenPhrase(prompt)).toBe("It's cold.")
    expect(extractSituationKeyFromErrorFixPrompt(prompt)).toContain('темно')
    expect(
      isErrorFixAiPairValid({
        prompt,
        targetAnswer: "It's dark.",
        lessonId: '1',
      })
    ).toBe(true)
    expect(
      isErrorFixAiPairValid({
        prompt,
        targetAnswer: "It's time.",
        lessonId: '1',
      })
    ).toBe(false)
  })
})
