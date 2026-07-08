import {
  buildCanonicalRoleplayPrompt,
  parseRoleIntroFromPrompt,
  resolveRoleplayScenario,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import { findLessonRoleplaySourceForPractice } from '@/lib/practice/prompt/buildRoleplayPrompt'
import { extractSituationLabel } from '@/lib/practice/buildChoicePrompt'
import type { LessonData } from '@/types/lesson'
import type { PracticeExerciseType, PracticeQuestion } from '@/types/practice'

export type PriorSessionPhrase = {
  stepIndex: number
  type: PracticeExerciseType
  targetAnswer: string
  prompt?: string
}

const ANCHOR_PRIORITY: ReadonlyArray<{ stepIndex: number; type: PracticeExerciseType }> = [
  { stepIndex: 4, type: 'free-response' },
  { stepIndex: 1, type: 'voice-shadow' },
  { stepIndex: 7, type: 'dictation' },
  { stepIndex: 8, type: 'listening-select' },
  { stepIndex: 3, type: 'sentence-surgery' },
  { stepIndex: 0, type: 'choice' },
]

export function collectPriorSessionPhrases(
  questions: PracticeQuestion[],
  beforeIndex: number
): PriorSessionPhrase[] {
  return questions
    .slice(0, beforeIndex)
    .map((question, stepIndex) => ({
      stepIndex,
      type: question.type,
      targetAnswer: question.targetAnswer,
      prompt: question.prompt,
    }))
    .filter((item) => item.targetAnswer.trim().length > 0)
}

export function selectRoleplayAnchor(phrases: PriorSessionPhrase[]): PriorSessionPhrase | null {
  for (const preferred of ANCHOR_PRIORITY) {
    const match = phrases.find(
      (phrase) => phrase.stepIndex === preferred.stepIndex && phrase.type === preferred.type
    )
    if (match) return match
  }
  return phrases.find((phrase) => phrase.targetAnswer.trim().length > 0) ?? null
}

function extractRuIntroFromPriorPrompt(prompt: string | undefined): string | null {
  if (!prompt?.trim()) return null
  const fromRoleplay = parseRoleIntroFromPrompt(prompt)
  if (fromRoleplay) return fromRoleplay

  const fromSituation = extractSituationLabel(prompt)
  if (fromSituation) {
    return fromSituation.replace(/^Ситуация:\s*/iu, '').replace(/^Тема:\s*/iu, '').trim()
  }
  const translateMatch = /Переведите на английский:\s*"([^"]+)"/iu.exec(prompt)
  if (translateMatch?.[1]) return translateMatch[1].trim()
  return null
}

export function resolveRuLineForAnchor(anchor: PriorSessionPhrase, lesson: LessonData): string {
  const fromPrompt = extractRuIntroFromPriorPrompt(anchor.prompt)
  if (fromPrompt) {
    return fromPrompt.replace(/[.!?…]+$/u, '') + (fromPrompt.includes('?') ? '' : '.')
  }

  const source = findLessonRoleplaySourceForPractice(lesson, anchor.stepIndex)
  const scenario = resolveRoleplayScenario({
    lesson,
    targetAnswer: anchor.targetAnswer,
    source: source ?? undefined,
    stepIndex: anchor.stepIndex,
    audience: 'adult',
  })
  return scenario.roleIntroRu
}

export function buildInterlocutorFromAnchor(
  anchor: PriorSessionPhrase,
  lesson: LessonData
): string {
  const source = findLessonRoleplaySourceForPractice(lesson, anchor.stepIndex)
  const priorIntroRu = extractRuIntroFromPriorPrompt(anchor.prompt)
  const scenario = resolveRoleplayScenario({
    lesson,
    targetAnswer: anchor.targetAnswer,
    source: source ?? undefined,
    stepIndex: anchor.stepIndex,
    audience: 'adult',
    priorIntroRu,
  })
  return scenario.interlocutorEn
}

export function buildRoleplayPromptFromAnchor(
  anchor: PriorSessionPhrase,
  lesson: LessonData
): string {
  const source = findLessonRoleplaySourceForPractice(lesson, anchor.stepIndex)
  const priorIntroRu = extractRuIntroFromPriorPrompt(anchor.prompt)
  const scenario = resolveRoleplayScenario({
    lesson,
    targetAnswer: anchor.targetAnswer,
    source: source ?? undefined,
    stepIndex: anchor.stepIndex,
    audience: 'adult',
    priorIntroRu,
  })
  return buildCanonicalRoleplayPrompt(scenario)
}

export function buildRoleplayFromLessonFallback(
  lesson: LessonData,
  stepIndex: number,
  targetAnswer: string
): string {
  const source = findLessonRoleplaySourceForPractice(lesson, stepIndex)
  const scenario = resolveRoleplayScenario({
    lesson,
    targetAnswer,
    source: source ?? undefined,
    stepIndex,
    audience: 'adult',
  })
  return buildCanonicalRoleplayPrompt(scenario)
}
