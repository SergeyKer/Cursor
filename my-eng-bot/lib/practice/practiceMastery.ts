import type { PracticeAnswer, PracticeQuestion, PracticeSession } from '@/types/practice'
import { computeMasteryPercent } from '@/lib/practice/practiceEconomyRules'
import { resolvePracticeTargetQuestionCount } from '@/lib/practice/practiceSessionProgress'

export type PracticeMasterySnapshot = {
  masteryScore: number
  correctedCount: number
  firstTrySessionXp: number
  plannedLength: number
  masteryPercent: number
}

function answersByQuestion(answers: PracticeAnswer[]): Map<string, PracticeAnswer[]> {
  const map = new Map<string, PracticeAnswer[]>()
  for (const answer of answers) {
    const list = map.get(answer.questionId) ?? []
    list.push(answer)
    map.set(answer.questionId, list)
  }
  return map
}

/** First-try correct: first recorded answer for the question is correct and not a correction. */
export function isFirstTryCorrect(answersForQuestion: PracticeAnswer[]): boolean {
  if (answersForQuestion.length === 0) return false
  const first = answersForQuestion[0]
  return Boolean(first?.isCorrect && !first.corrected)
}

export function computePracticeMasterySnapshot(session: Pick<
  PracticeSession,
  'answers' | 'questions' | 'mode' | 'targetQuestionCount'
>): PracticeMasterySnapshot {
  const plannedLength = Math.max(1, resolvePracticeTargetQuestionCount(session as PracticeSession))
  const byQuestion = answersByQuestion(session.answers)
  let masteryScore = 0
  let correctedCount = 0
  let firstTrySessionXp = 0

  const questionById = new Map<string, PracticeQuestion>()
  for (const question of session.questions) {
    questionById.set(question.id, question)
  }

  for (const question of session.questions) {
    const list = byQuestion.get(question.id) ?? []
    if (isFirstTryCorrect(list)) {
      masteryScore += 1
      firstTrySessionXp += Math.max(0, question.xpBase)
    }
    if (list.some((answer) => answer.corrected && answer.isCorrect)) {
      correctedCount += 1
    }
  }

  return {
    masteryScore,
    correctedCount,
    firstTrySessionXp,
    plannedLength,
    masteryPercent: computeMasteryPercent(masteryScore, plannedLength),
  }
}
