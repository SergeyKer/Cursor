import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'
import type { PracticeExerciseType } from '@/types/practice'

describe('buildLocalPracticeSession', () => {
  it('builds relaxed practice from a structured lesson without AI', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'relaxed',
      entrySource: 'after_lesson',
    })

    expect(session.questions).toHaveLength(6)
    expect(session.generationSource).toBe('local')
    expect(session.questions.every((question) => question.lessonId === '1')).toBe(true)
    expect(session.wrongAttemptsOnCurrentQuestion).toBe(0)
  })

  it('puts a boss challenge at the end of challenge mode', () => {
    const lesson = getStructuredLessonById('2')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '2' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    expect(session.questions).toHaveLength(12)
    expect(session.questions.at(-1)?.type).toBe('boss-challenge')
  })

  it('builds UI-ready data for all 12 exercise types in challenge mode', () => {
    const lesson = getStructuredLessonById('3')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '3' },
      mode: 'challenge',
      entrySource: 'menu',
    })
    const questionsByType = new Map(session.questions.map((question) => [question.type, question]))
    const expectedTypes: PracticeExerciseType[] = [
      'choice',
      'voice-shadow',
      'dropdown-fill',
      'listening-select',
      'context-clue',
      'sentence-surgery',
      'free-response',
      'word-builder-pro',
      'dictation',
      'roleplay-mini',
      'speed-round',
      'boss-challenge',
    ]

    expect([...questionsByType.keys()]).toEqual(expectedTypes)
    expect(questionsByType.get('voice-shadow')?.audioText).toBeTruthy()
    expect(questionsByType.get('listening-select')?.audioText).toBeTruthy()
    expect(questionsByType.get('dictation')?.audioText).toBeTruthy()
    expect(questionsByType.get('sentence-surgery')?.shuffledWords?.length).toBeGreaterThan(0)
    expect(questionsByType.get('word-builder-pro')?.shuffledWords?.length).toBeGreaterThan(0)
    expect(questionsByType.get('roleplay-mini')?.keywords?.length).toBeGreaterThan(0)
    expect(questionsByType.get('boss-challenge')?.minWords).toBeGreaterThanOrEqual(5)

    const choiceLikeTypes = session.questions.filter((q) => isChoiceLikePracticeType(q.type))
    expect(choiceLikeTypes.length).toBeGreaterThan(0)
    for (const question of choiceLikeTypes) {
      expect(question.options?.length ?? 0).toBeGreaterThanOrEqual(3)
    }
  })

  it('repeats one reference exercise 7 times in reference mode', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'reference',
      entrySource: 'menu',
    })

    expect(session.questions).toHaveLength(7)
    expect(new Set(session.questions.map((question) => question.type)).size).toBe(1)
    expect(new Set(session.questions.map((question) => question.prompt)).size).toBe(1)
    expect(session.questions[0]?.prompt).toMatch(/Ситуация:/i)
    expect(session.questions[0]?.prompt).not.toMatch(/^Какое предложение подходит/i)
  })
})

