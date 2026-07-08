import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildEtalonRoleplayPromptForLesson,
  roleplayPromptHasContext,
} from '@/lib/practice/prompt/buildRoleplayPrompt'

describe('buildRoleplayPrompt', () => {
  it('builds etalon prompt with interlocutor for lessons 1-4', () => {
    for (const lessonId of ['1', '2', '3', '4']) {
      const lesson = getStructuredLessonById(lessonId)
      expect(lesson).not.toBeNull()
      const prompt = buildEtalonRoleplayPromptForLesson(lesson!, 0)
      expect(prompt).toBeTruthy()
      expect(roleplayPromptHasContext(prompt!)).toBe(true)
      expect(prompt).toMatch(/Собеседник:\s*«[^»]+\?»/)
    }
  })
})
