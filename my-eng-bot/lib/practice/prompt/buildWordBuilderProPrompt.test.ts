import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { lessonForPracticeStep } from '@/lib/practice/buildPracticeDiversity'
import { buildWordBuilderProPrompt } from '@/lib/practice/prompt/buildWordBuilderProPrompt'
import { DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT } from '@/lib/practice/resolvePracticeSentencePuzzleSlice'

describe('buildWordBuilderProPrompt', () => {
  it('merges situation from targetAnswer with puzzle instruction', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const puzzleStep = lesson!.steps.find((step) => step.exercise?.type === 'sentence_puzzle')
    expect(puzzleStep?.exercise).toBeTruthy()
    const targetAnswer = puzzleStep!.exercise!.correctAnswer

    const prompt = buildWordBuilderProPrompt({
      step: puzzleStep!,
      exercise: puzzleStep!.exercise!,
      lesson: lesson!,
      puzzlePrompt: DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT,
      targetAnswer,
    })

    expect(prompt).toMatch(/Ситуация:|ситуаци/i)
    expect(prompt).toContain('Расставьте слова')
  })

  it('does not duplicate situation when puzzle prompt already has context', () => {
    const lesson = getStructuredLessonById('1')
    const puzzleStep = lesson!.steps.find((step) => step.exercise?.type === 'sentence_puzzle')
    const situation = 'Ситуация: Уже поздно, пора домой.'
    const prompt = buildWordBuilderProPrompt({
      step: puzzleStep!,
      exercise: puzzleStep!.exercise!,
      lesson: lesson!,
      puzzlePrompt: `${situation} Расставьте слова в правильном порядке.`,
      targetAnswer: "It's time to go home.",
    })
    expect(prompt).toBe(`${situation} Расставьте слова в правильном порядке.`)
  })

  it('uses name situation for lesson 4 Britain target', () => {
    const lesson = lessonForPracticeStep(getStructuredLessonById('4')!, 2)
    const puzzleStep = lesson.steps.find((step) => step.exercise?.type === 'sentence_puzzle')
    const prompt = buildWordBuilderProPrompt({
      step: puzzleStep!,
      exercise: puzzleStep!.exercise!,
      lesson,
      puzzlePrompt: DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT,
      targetAnswer: "I'm from Britain.",
    })
    expect(prompt).toMatch(/Алекс/i)
    expect(prompt).not.toMatch(/настроени/i)
  })
})
