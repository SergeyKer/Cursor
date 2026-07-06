import { describe, expect, it } from 'vitest'
import {
  buildDictationTaskPrompt,
  DICTATION_INSTRUCTION,
  dictationPromptHasLeakMarkers,
  isDictationStylePrompt,
} from '@/lib/practice/prompt/dictationPromptFormat'

describe('dictationPromptFormat', () => {
  it('builds canonical one-line task prompt', () => {
    const prompt = buildDictationTaskPrompt('На улице холодно')
    expect(prompt).toBe(`Ситуация: На улице холодно. ${DICTATION_INSTRUCTION}`)
    expect(prompt).not.toContain('\n')
  })

  it('detects dictation style prompt', () => {
    expect(isDictationStylePrompt(buildDictationTaskPrompt('Пора спать'))).toBe(true)
    expect(isDictationStylePrompt('Переведите на английский: "Темно"')).toBe(false)
    expect(
      isDictationStylePrompt('Выберите слово для пропуска: "Темно" - «It is ___».')
    ).toBe(false)
  })

  it('flags leak markers', () => {
    expect(dictationPromptHasLeakMarkers('Переведите на английский')).toBe(true)
    expect(dictationPromptHasLeakMarkers('Ситуация: test. Прослушайте фразу целиком.')).toBe(false)
  })
})
