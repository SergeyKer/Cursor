import { describe, expect, it } from 'vitest'
import {
  bossChallengePromptHasContext,
  buildEtalonBossChallengePromptForLesson,
} from '@/lib/practice/prompt/buildBossChallengePrompt'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('buildBossChallengePrompt', () => {
  it('builds situational prompt with action frame and without exam meta', () => {
    const lesson = getStructuredLessonById('1')!
    const prompt = buildEtalonBossChallengePromptForLesson(lesson, 0)
    expect(prompt).toBeTruthy()
    expect(prompt).toMatch(/Ситуация:|Тема:/i)
    expect(prompt).toMatch(/напиш/iu)
    expect(prompt).not.toMatch(/Финальный вызов|примените тему|соберите всё|Переведите/iu)
    expect(prompt).not.toMatch(/\b(i am|i'm|who|i know what)\b/iu)
    expect(bossChallengePromptHasContext(prompt!)).toBe(true)
  })

  it('builds a clear Russian frame for introducing-yourself lesson', () => {
    const lesson = getStructuredLessonById('4')!
    const prompt = buildEtalonBossChallengePromptForLesson(lesson, 0)
    expect(prompt).toBeTruthy()
    expect(prompt).toMatch(/о себе/iu)
    expect(prompt).toMatch(/напиш/iu)
    expect(prompt).not.toMatch(/\b(i am|i'm)\b/iu)
    expect(prompt).not.toMatch(/[—–]/u)
    expect(bossChallengePromptHasContext(prompt!)).toBe(true)
  })

  it('rejects prompts with English pattern starters', () => {
    expect(
      bossChallengePromptHasContext('Ситуация: на знакомстве. Напишите о себе по ситуации (I am…).')
    ).toBe(false)
    expect(bossChallengePromptHasContext('Ситуация: разговор. Спросите Who… по ситуации.')).toBe(false)
    expect(
      bossChallengePromptHasContext('Ситуация: тема. Напишите фразу с I know what… по ситуации.')
    ).toBe(false)
  })
})
