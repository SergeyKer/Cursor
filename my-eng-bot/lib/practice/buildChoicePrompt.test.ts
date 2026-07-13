import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildChoicePrompt,
  buildEtalonChoicePromptForLesson,
  choicePromptHasContext,
  findFirstLessonChoiceStep,
  findLessonChoiceStepForPractice,
  isAbstractChoiceQuestion,
} from '@/lib/practice/buildChoicePrompt'

describe('buildChoicePrompt', () => {
  it('detects abstract choice questions', () => {
    expect(isAbstractChoiceQuestion('Какое предложение подходит по смыслу?')).toBe(true)
    expect(isAbstractChoiceQuestion('Pick one.')).toBe(true)
    expect(isAbstractChoiceQuestion('Ситуация: темно. Что описывает состояние?')).toBe(false)
  })

  it('builds contextual prompt for lesson 1 (It\'s / It\'s time to)', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const source = findFirstLessonChoiceStep(lesson!)
    expect(source).not.toBeNull()

    const prompt = buildChoicePrompt(source!.step, source!.exercise, lesson!)
    expect(prompt).toMatch(/Ситуация:/i)
    expect(prompt).toMatch(/состояние/i)
    expect(choicePromptHasContext(prompt)).toBe(true)
    expect(isAbstractChoiceQuestion(prompt)).toBe(false)
  })

  it('rotates etalon choice prompt across variant profiles for lesson 1', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const first = buildEtalonChoicePromptForLesson(lesson!, 0)
    const third = buildEtalonChoicePromptForLesson(lesson!, 2)
    expect(first).toMatch(/темно/i)
    expect(third).toMatch(/жарко/i)
    expect(first).not.toBe(third)
  })

  it('keeps Who is that? constant across lesson 2 profiles', () => {
    const lesson = getStructuredLessonById('2')
    expect(lesson).not.toBeNull()

    const first = findLessonChoiceStepForPractice(lesson!, 0)
    const second = findLessonChoiceStepForPractice(lesson!, 1)
    expect(first?.exercise.correctAnswer).toBe('Who is that?')
    expect(second?.exercise.correctAnswer).toBe('Who is that?')
  })

  it('builds lesson-specific frame for lesson 2 (Who)', () => {
    const lesson = getStructuredLessonById('2')
    expect(lesson).not.toBeNull()
    const prompt = buildEtalonChoicePromptForLesson(lesson!)
    expect(prompt).toMatch(/вопрос про человека|человек/i)
    expect(choicePromptHasContext(prompt!)).toBe(true)
  })

  it('builds contextual prompt for lesson 3 with situation bubble', () => {
    const lesson = getStructuredLessonById('3')
    expect(lesson).not.toBeNull()
    const prompt = buildEtalonChoicePromptForLesson(lesson!)
    expect(prompt).toMatch(/Ситуация:|вложен/i)
    expect(choicePromptHasContext(prompt!)).toBe(true)
  })

  it('builds contextual prompt for lesson 4 (I am)', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).not.toBeNull()
    const prompt = buildEtalonChoicePromptForLesson(lesson!)
    expect(prompt).toMatch(/настроение|Ситуация:|Тема:/i)
    expect(choicePromptHasContext(prompt!)).toBe(true)
  })
})
