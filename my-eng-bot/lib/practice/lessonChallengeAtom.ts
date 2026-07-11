import { applyLessonPracticeScenario } from '@/lib/practice/lessonPracticeScenario'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import type { LessonChallengeAtom, LessonData } from '@/types/lesson'
import type { PracticeMode, PracticeQuestion } from '@/types/practice'

export function getLessonChallengeAtoms(lesson: LessonData): LessonChallengeAtom[] {
  return lesson.repeatConfig?.challengeAtoms ?? []
}

export function getLessonChallengeAtom(
  lesson: LessonData,
  stepIndex: number
): LessonChallengeAtom | null {
  if (lesson.id !== '3') return null
  const atoms = getLessonChallengeAtoms(lesson)
  return atoms.find((atom) => atom.stepIndex === stepIndex) ?? null
}

export function shouldApplyLessonChallengeAtom(
  lesson: LessonData,
  mode: PracticeMode,
  stepIndex: number
): boolean {
  return lesson.id === '3' && mode === 'challenge' && getLessonChallengeAtom(lesson, stepIndex) != null
}

export function applyLessonChallengeAtom(
  question: PracticeQuestion,
  atom: LessonChallengeAtom,
  lesson: LessonData
): PracticeQuestion {
  const expectedType = CHALLENGE_STEP_SPECS[atom.stepIndex]?.type
  if (expectedType && question.type !== expectedType) return question

  return applyLessonPracticeScenario(question, atom, lesson, {
    requireExactTarget: question.type === 'roleplay-mini' && atom.stepIndex === 9 ? true : question.requireExactTarget,
  })
}
