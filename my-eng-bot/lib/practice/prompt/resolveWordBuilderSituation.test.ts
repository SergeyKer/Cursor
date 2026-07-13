import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { lessonForPracticeStep } from '@/lib/practice/buildPracticeDiversity'
import { resolveWordBuilderSituation } from '@/lib/practice/prompt/resolveWordBuilderSituation'
import { findMatchingPuzzleVariant } from '@/lib/practice/resolvePracticeSentencePuzzleSlice'

describe('resolveWordBuilderSituation', () => {
  it('returns name situation for Britain phrase on Alex profile', () => {
    const lesson = lessonForPracticeStep(getStructuredLessonById('4')!, 2)
    const puzzleStep = lesson.steps.find((step) => step.exercise?.type === 'sentence_puzzle')
    const exercise = puzzleStep!.exercise!
    const targetAnswer = "I'm from Britain."
    const matchedVariant = findMatchingPuzzleVariant(exercise, targetAnswer)

    const situation = resolveWordBuilderSituation({
      targetAnswer,
      lesson,
      exercise,
      matchedVariant,
    })

    expect(situation).toMatch(/Алекс/i)
    expect(situation).not.toMatch(/настроени/i)
  })

  it('returns name situation for engineer phrase on Maria profile', () => {
    const lesson = lessonForPracticeStep(getStructuredLessonById('4')!, 1)
    const puzzleStep = lesson.steps.find((step) => step.exercise?.type === 'sentence_puzzle')
    const exercise = puzzleStep!.exercise!
    const targetAnswer = 'I am an engineer.'
    const matchedVariant = findMatchingPuzzleVariant(exercise, targetAnswer)

    const situation = resolveWordBuilderSituation({
      targetAnswer,
      lesson,
      exercise,
      matchedVariant,
    })

    expect(situation).toMatch(/Мария/i)
    expect(situation).not.toMatch(/настроени/i)
  })
})
