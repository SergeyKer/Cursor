import { filterByChoiceGranularity, inferChoiceGranularity } from '@/lib/practice/choiceOptionGranularity'
import { buildTieredChoiceOptions } from '@/lib/practice/distractorTier'
import {
  getPracticeStepSpec,
  resolveEffectivePracticeStepSpec,
  resolveTierForStep,
  type PracticeDistractorTier,
} from '@/lib/practice/engine/stepSpec'
import { isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'
import { collectLessonChoicePool } from '@/lib/practice/lessonChoicePool'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { resolvePracticeLessonStep } from '@/lib/practice/resolvePracticeLessonStep'
import type { LessonData } from '@/types/lesson'
import type { PracticeQuestion, PracticeSession } from '@/types/practice'

const CHALLENGE_SPEED_ROUND_INDEX = 10

const TIER_RANK: Record<PracticeDistractorTier, number> = {
  obvious: 0,
  'semantic-near': 1,
  'minimal-pair': 2,
}

export function resolveLessonFromSession(session: PracticeSession): LessonData | null {
  if (session.source.kind === 'runtime_lesson') return session.source.lesson
  return getStructuredLessonById(session.lessonId)
}

function isTierDowngrade(baseTier: PracticeDistractorTier, effectiveTier: PracticeDistractorTier): boolean {
  return TIER_RANK[effectiveTier] < TIER_RANK[baseTier]
}

export function applyAdaptiveChoiceTier(
  session: PracticeSession,
  questionIndex: number,
  lesson: LessonData
): PracticeQuestion | null {
  if (session.mode !== 'challenge' || questionIndex !== CHALLENGE_SPEED_ROUND_INDEX) return null

  const question = session.questions[questionIndex]
  if (!question || !isChoiceLikePracticeType(question.type)) return null

  const baseSpec = getPracticeStepSpec(session.mode, questionIndex)
  const baseTier = baseSpec?.distractorTier ? resolveTierForStep(session.mode, baseSpec) : undefined
  if (!baseTier) return null

  const effectiveSpec = resolveEffectivePracticeStepSpec(session, questionIndex)
  const effectiveTier = effectiveSpec?.distractorTier
  if (!effectiveTier || !isTierDowngrade(baseTier, effectiveTier)) return null

  const resolved = resolvePracticeLessonStep({
    lesson,
    practiceIndex: questionIndex,
    practiceType: question.type,
    mode: session.mode,
  })
  const granularity = inferChoiceGranularity({
    targetAnswer: question.targetAnswer,
    answerFormat: resolved?.exercise.answerFormat,
    prompt: question.prompt,
    exerciseType: resolved?.exercise.type,
  })
  const filteredCanonical = filterByChoiceGranularity(resolved?.canonicalOptions ?? [], granularity)
  const lessonPool = collectLessonChoicePool(lesson, question.targetAnswer, {
    sourceStepNumber: resolved?.sourceStepNumber,
    granularity,
  })
  const options = buildTieredChoiceOptions(question.targetAnswer, effectiveTier, lessonPool, {
    granularity,
    canonicalOptions: resolved?.canonicalOptions,
    sourceStepOptionCount: filteredCanonical.length,
  })
  return { ...question, options }
}

export function normalizeAdaptiveQuestionInSession(session: PracticeSession): PracticeSession {
  if (session.mode !== 'challenge' || session.currentIndex !== CHALLENGE_SPEED_ROUND_INDEX) return session
  if (!session.questions[CHALLENGE_SPEED_ROUND_INDEX]) return session

  const lesson = resolveLessonFromSession(session)
  if (!lesson) return session

  const patched = applyAdaptiveChoiceTier(session, CHALLENGE_SPEED_ROUND_INDEX, lesson)
  if (!patched) return session

  const questions = [...session.questions]
  questions[CHALLENGE_SPEED_ROUND_INDEX] = patched
  return { ...session, questions }
}
