import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildEtalonFreeResponsePromptForLesson,
  buildFreeResponsePrompt,
  findLessonFreeResponseSourceForPractice,
} from '@/lib/practice/prompt/buildFreeResponsePrompt'
import { isTranslateStylePrompt } from '@/lib/practice/prompt/promptSourceUtils'

describe('buildFreeResponsePrompt', () => {
  it('uses translate question for lesson 4 reference slots', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).not.toBeNull()

    for (const stepIndex of [0, 2, 4]) {
      const source = findLessonFreeResponseSourceForPractice(lesson!, stepIndex)
      expect(source).not.toBeNull()
      const prompt = buildFreeResponsePrompt(source!, lesson!, stepIndex)
      expect(isTranslateStylePrompt(prompt)).toBe(true)
      expect(prompt).toMatch(/Переведите на английский/i)
    }
  })

  it('rotates translate prompts across reference step indices', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).not.toBeNull()

    const prompts = [0, 1, 2, 3, 4].map((stepIndex) => buildEtalonFreeResponsePromptForLesson(lesson!, stepIndex))
    expect(prompts.every((prompt) => prompt && isTranslateStylePrompt(prompt))).toBe(true)
    expect(new Set(prompts).size).toBeGreaterThanOrEqual(3)
  })

  it('uses translate question for lesson 1 reference slots', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const prompt = buildEtalonFreeResponsePromptForLesson(lesson!, 0)
    expect(prompt).not.toBeNull()
    expect(isTranslateStylePrompt(prompt!)).toBe(true)
  })
})
