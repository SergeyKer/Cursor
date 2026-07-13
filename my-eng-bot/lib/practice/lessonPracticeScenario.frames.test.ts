import { describe, expect, it } from 'vitest'
import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('lessonPracticeScenario frames', () => {
  for (const lessonId of ['1', '2', '4'] as const) {
    it(`lesson ${lessonId} challenge prompts avoid L3-only frames`, () => {
      const lesson = getStructuredLessonById(lessonId)
      expect(lesson).not.toBeNull()

      const session = buildLocalPracticeSession({
        lesson: lesson!,
        source: { kind: 'static_lesson', lessonId },
        mode: 'challenge',
        entrySource: 'menu',
      })

      expect(session.questions[0]?.prompt).not.toMatch(/вложен/i)
      expect(session.questions[2]?.prompt).not.toMatch(/вложен/i)
      expect(session.questions[11]?.prompt).not.toMatch(/\bbut\b/i)
      expect(session.questions[11]?.prompt).toMatch(/Ситуация:/i)
    })
  }

  it('lesson 3 keeps embedded and but frames', () => {
    const lesson = getStructuredLessonById('3')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '3' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    expect(session.questions[0]?.prompt).toMatch(/вложен/i)
    expect(session.questions[11]?.prompt).toMatch(/\bbut\b/i)
  })
})
