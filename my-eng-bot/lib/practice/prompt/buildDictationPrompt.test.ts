import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildDictationPrompt,
  buildEtalonDictationPromptForLesson,
  findLessonDictationSourceForPractice,
} from '@/lib/practice/prompt/buildDictationPrompt'
import { isDictationStylePrompt } from '@/lib/practice/prompt/dictationPromptFormat'

describe('buildDictationPrompt', () => {
  it('builds etalon prompt without translate leak', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const prompt = buildEtalonDictationPromptForLesson(lesson!, 0)
    expect(prompt).toBeTruthy()
    expect(isDictationStylePrompt(prompt!)).toBe(true)
    expect(prompt).not.toMatch(/переведите/i)
    expect(prompt).not.toContain('\n')
  })

  it('rotates Russian situation by stepIndex', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const prompts = [0, 1, 2, 3].map((stepIndex) => {
      const source = findLessonDictationSourceForPractice(lesson!, stepIndex)
      expect(source).not.toBeNull()
      return buildDictationPrompt(source!, lesson!, stepIndex, source!.exercise.correctAnswer)
    })

    expect(new Set(prompts).size).toBeGreaterThanOrEqual(3)
    for (const prompt of prompts) {
      expect(isDictationStylePrompt(prompt)).toBe(true)
    }
  })
})
