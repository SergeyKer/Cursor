import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT,
  isStaleLessonPuzzlePrompt,
  resolvePracticeSentencePuzzleSlice,
} from '@/lib/practice/resolvePracticeSentencePuzzleSlice'
import type { Exercise } from '@/types/lesson'

function sentencePuzzleExerciseFromLesson(lessonId: string): Exercise {
  const lesson = getStructuredLessonById(lessonId)
  expect(lesson).not.toBeNull()
  const step = lesson!.steps.find((item) => item.exercise?.type === 'sentence_puzzle')
  expect(step?.exercise).toBeTruthy()
  return step!.exercise as Exercise
}

describe('isStaleLessonPuzzlePrompt', () => {
  it('detects multi-puzzle lesson copy', () => {
    expect(isStaleLessonPuzzlePrompt('Соберите три предложения из слов.')).toBe(true)
    expect(isStaleLessonPuzzlePrompt('Соберите три фразы из слов.')).toBe(true)
    expect(isStaleLessonPuzzlePrompt('Расставьте слова в правильном порядке.')).toBe(false)
  })
})

describe('resolvePracticeSentencePuzzleSlice', () => {
  it('lesson 1: matches final puzzle tokens for go home answer', () => {
    const exercise = sentencePuzzleExerciseFromLesson('1')
    const slice = resolvePracticeSentencePuzzleSlice(exercise)
    expect(slice).not.toBeNull()
    expect(slice!.targetAnswer).toMatch(/go home/i)
    expect(slice!.wordTokens).toEqual(["It's", 'time', 'to', 'go', 'home'])
    expect(slice!.wordTokens).not.toContain('dark')
    expect(slice!.prompt).not.toMatch(/три предложен/i)
    expect(isStaleLessonPuzzlePrompt(slice!.prompt)).toBe(false)
  })

  it('lesson 2: resolves first puzzle when correctAnswer matches puzzle 1', () => {
    const exercise = sentencePuzzleExerciseFromLesson('2')
    const slice = resolvePracticeSentencePuzzleSlice(exercise)
    expect(slice).not.toBeNull()
    expect(slice!.wordTokens.length).toBeGreaterThan(0)
    expect(slice!.prompt).toBeTruthy()
  })

  it('returns null for non sentence_puzzle exercise', () => {
    const lesson = getStructuredLessonById('1')
    const translate = lesson!.steps.find((item) => item.exercise?.type === 'translate')!.exercise as Exercise
    expect(resolvePracticeSentencePuzzleSlice(translate)).toBeNull()
  })

  it('uses default prompt when variant instruction is empty', () => {
    const exercise = sentencePuzzleExerciseFromLesson('1')
    const slice = resolvePracticeSentencePuzzleSlice(exercise)
    expect(slice?.prompt).toBe(DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT)
  })
})
