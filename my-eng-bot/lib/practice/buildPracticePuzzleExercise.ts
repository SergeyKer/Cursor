import { DEFAULT_PUZZLE_ERROR_TEXT } from '@/lib/puzzlePanelLayout'
import { tokensFromTargetAnswer } from '@/lib/practice/rebuildPracticeWordTokensFromAnswer'
import type { Exercise, SentencePuzzleVariant } from '@/types/lesson'
import type { PracticeQuestion } from '@/types/practice'

export function buildPracticePuzzleExercise(question: PracticeQuestion): Exercise {
  const correctOrder = tokensFromTargetAnswer(question.targetAnswer)
  const coreWords = question.shuffledWords ?? correctOrder
  const words =
    question.type === 'word-builder-pro'
      ? [...coreWords, ...(question.extraWords ?? [])]
      : [...coreWords]

  const variant: SentencePuzzleVariant = {
    id: `practice-${question.id}`,
    title: '',
    instruction: '',
    words,
    correctOrder,
    correctAnswer: question.targetAnswer,
    successText: '',
    errorText: DEFAULT_PUZZLE_ERROR_TEXT,
    hintText: question.hint ?? '',
    myEngComment: '',
  }

  return {
    type: 'sentence_puzzle',
    question: question.prompt,
    correctAnswer: question.targetAnswer,
    acceptedAnswers: question.acceptedAnswers,
    puzzleVariants: [variant, variant, variant],
  }
}
