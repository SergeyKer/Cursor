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
    expect(bossChallengePromptHasContext(prompt!)).toBe(true)
  })

  it('builds a clear frame for introducing-yourself lesson', () => {
    const lesson = getStructuredLessonById('4')!
    const prompt = buildEtalonBossChallengePromptForLesson(lesson, 0)
    expect(prompt).toBeTruthy()
    expect(prompt).toMatch(/I am/i)
    expect(bossChallengePromptHasContext(prompt!)).toBe(true)
  })
})
