import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildPracticeDiversityPayload,
  collectPracticeSourceSituations,
  lessonForPracticeStep,
  pickSuggestedScenario,
  pickVariantProfileForStep,
} from '@/lib/practice/buildPracticeDiversity'

describe('buildPracticeDiversity', () => {
  it('rotates variant profiles by step index for lesson 1', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const first = pickVariantProfileForStep(lesson!, 0)
    const second = pickVariantProfileForStep(lesson!, 1)
    expect(first?.id).toBe('evening-dark')
    expect(second?.id).toBe('cold-study')
  })

  it('includes expanded formal-it scenarios in sourceSituations', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const situations = collectPracticeSourceSituations(lesson!)
    expect(situations).toContain('На улице солнечно')
    expect(situations).toContain('Далеко отсюда')
    expect(situations).toContain('Сейчас пять часов')
  })

  it('avoids repeating recent prompts when picking suggested scenario', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const situations = collectPracticeSourceSituations(lesson!)
    const first = pickSuggestedScenario(situations, 0, [])
    expect(first).toBeTruthy()

    const second = pickSuggestedScenario(situations, 0, [first!])
    expect(second).not.toBe(first)
  })

  it('builds reference diversity rule without always defaulting to darkness', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const payload = buildPracticeDiversityPayload({
      lesson: lesson!,
      mode: 'reference',
      stepIndex: 2,
      total: 7,
      recentPrompts: ['Ситуация: На улице темно.'],
    })

    expect(payload.suggestedScenario).toBeTruthy()
    expect(payload.suggestedScenario).not.toBe('На улице темно')
    expect(payload.diversityRule).toMatch(/weather|time|distance|темно/i)
    expect(payload.scenarioCategories).toEqual(['weather', 'time', 'distance'])
  })

  it('lessonForPracticeStep swaps hook scenario for lesson 1', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const scoped = lessonForPracticeStep(lesson!, 1)
    const task = scoped.steps[0]?.bubbles.find((bubble) => bubble.type === 'task')?.content ?? ''
    expect(task).toContain('холодно')
    expect(task).not.toContain('темно')
  })

  it('includes word-builder-pro grammar trap rules in reference diversity', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const payload = buildPracticeDiversityPayload({
      lesson: lesson!,
      mode: 'reference',
      stepIndex: 0,
      total: 7,
      referenceExerciseType: 'word-builder-pro',
    })
    expect(payload.diversityRule).toMatch(/grammar/i)
    expect(payload.diversityRule).toMatch(/sleep|drink/i)
  })

  it('includes word-builder-pro rules in challenge session diversity', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const payload = buildPracticeDiversityPayload({
      lesson: lesson!,
      mode: 'challenge',
      stepIndex: 6,
    })
    expect(payload.diversityRule).toMatch(/word-builder-pro/i)
    expect(payload.diversityRule).toMatch(/grammar traps/i)
  })
})
