import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildEtalonListeningSelectPromptForLesson,
  buildListeningSelectPrompt,
  findLessonListeningSelectSourceForPractice,
  LISTENING_SELECT_SYSTEM_RULES,
  listeningSelectPromptHasContext,
} from '@/lib/practice/prompt/buildListeningSelectPrompt'

describe('buildListeningSelectPrompt', () => {
  it('builds etalon situational prompt without listening instruction', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const prompt = buildEtalonListeningSelectPromptForLesson(lesson!, 0)
    expect(prompt).toBeTruthy()
    expect(listeningSelectPromptHasContext(prompt!)).toBe(true)
    expect(prompt).not.toMatch(/Прослушайте/i)
    expect(prompt).not.toMatch(/переведите/i)
    expect(prompt).not.toMatch(/___/)
  })

  it('does not leak English target into prompt', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const source = findLessonListeningSelectSourceForPractice(lesson!, 0)
    expect(source).not.toBeNull()
    const target = source!.exercise.correctAnswer
    const prompt = buildListeningSelectPrompt(source!, lesson!, 0, target)
    expect(prompt).not.toContain(target)
    expect(listeningSelectPromptHasContext(prompt)).toBe(true)
  })

  it('exposes strengthened system rules', () => {
    expect(LISTENING_SELECT_SYSTEM_RULES.length).toBeGreaterThanOrEqual(5)
    expect(LISTENING_SELECT_SYSTEM_RULES.join(' ')).toMatch(/audioText/i)
    expect(LISTENING_SELECT_SYSTEM_RULES.join(' ')).toMatch(/options MUST include targetAnswer/i)
  })
})
