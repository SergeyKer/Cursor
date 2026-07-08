import { buildLocalPracticeSession, buildSinglePracticeQuestion } from '@/lib/practice/builders/localPracticeBuilder'
import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import { pickFreshReferencePracticeQuestion } from '@/lib/practice/pickFreshReferencePracticeQuestion'
import { REFERENCE_STEP_MAP_TYPES } from '@/lib/practice/prompt/promptSourceTypes'
import { collectRecentInterlocutorLines, collectRecentRoleIntroLines, collectRecentTargetAnswers } from '@/lib/practice/roleplaySessionDedup'
import type { LessonData } from '@/types/lesson'
import type { PracticeExerciseType, PracticeMode, PracticeQuestion } from '@/types/practice'

export type BuildReferenceFallbackQuestionParams = {
  lesson: LessonData
  mode: PracticeMode
  referenceExerciseType: PracticeExerciseType
  referenceStepIndex?: number
  referenceTotal?: number
  recentPrompts?: string[]
  seenKeys?: string[]
  recentTargetAnswers?: string[]
  recentInterlocutorLines?: string[]
  recentRoleIntroLines?: string[]
}

function fallbackQuestions(lesson: LessonData, mode: PracticeMode): PracticeQuestion[] {
  return buildLocalPracticeSession({
    lesson,
    mode,
    source: { kind: 'static_lesson', lessonId: lesson.id },
    entrySource: 'menu',
    generationSource: 'local',
  }).questions
}

function rotateCandidates<T>(items: T[], startIndex: number): T[] {
  if (items.length === 0) return []
  const offset = ((startIndex % items.length) + items.length) % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

export function synthesizeReferenceFallbackPrompt(basePrompt: string, stepIndex: number, total: number): string {
  const scenarioNumber = stepIndex + 1
  return `Сценарий ${scenarioNumber} из ${total}: ${basePrompt}`
}

function buildSynthesizedReferenceFallback(
  base: PracticeQuestion,
  stepIndex: number,
  total: number,
  seen: Set<string>
): PracticeQuestion | null {
  for (let offset = 0; offset < total; offset += 1) {
    const index = stepIndex + offset
    const prompt = synthesizeReferenceFallbackPrompt(base.prompt, index, total)
    const candidate: PracticeQuestion = {
      ...base,
      prompt,
      id: `${base.id}-rfb-${Date.now()}-${index}`,
    }
    const fingerprint = buildPracticeQuestionFingerprintFromQuestion(candidate)
    if (fingerprint && !seen.has(fingerprint)) {
      return candidate
    }
  }
  return null
}

function collectReferenceFallbackCandidates(
  lesson: LessonData,
  mode: PracticeMode,
  referenceExerciseType: PracticeExerciseType
): PracticeQuestion[] {
  const profiles = lesson.repeatConfig?.variantProfiles ?? []
  const candidateCount = REFERENCE_STEP_MAP_TYPES.has(referenceExerciseType)
    ? 12
    : Math.max(profiles.length, 1)

  if (profiles.length === 0 && !REFERENCE_STEP_MAP_TYPES.has(referenceExerciseType)) {
    return fallbackQuestions(lesson, mode).filter((question) => question.type === referenceExerciseType)
  }

  const candidates: PracticeQuestion[] = []
  for (let index = 0; index < candidateCount; index += 1) {
    const question = buildSinglePracticeQuestion({
      lesson,
      type: referenceExerciseType,
      questionIndex: index,
      mode,
      referenceExerciseType,
    })
    if (question) candidates.push(question)
  }
  return candidates
}

export function buildReferenceFallbackQuestion(params: BuildReferenceFallbackQuestionParams): PracticeQuestion | null {
  const referenceStepIndex = params.referenceStepIndex ?? 0
  const referenceTotal = params.referenceTotal ?? 7
  const normalizedRecent = new Set(
    (params.recentPrompts ?? [])
      .map((prompt) => prompt.trim().toLowerCase())
      .filter(Boolean)
  )
  const seen = new Set((params.seenKeys ?? []).filter(Boolean))
  const recentTargetAnswers = params.recentTargetAnswers ?? []
  const recentInterlocutorLines = params.recentInterlocutorLines ?? []
  const recentRoleIntroLines = params.recentRoleIntroLines ?? []
  const candidates = collectReferenceFallbackCandidates(
    params.lesson,
    params.mode,
    params.referenceExerciseType
  )
  if (candidates.length === 0) {
    const synthesized = buildSinglePracticeQuestion({
      lesson: params.lesson,
      type: params.referenceExerciseType,
      questionIndex: referenceStepIndex,
      mode: params.mode,
      referenceExerciseType: params.referenceExerciseType,
    })
    if (!synthesized) return null
    return {
      ...synthesized,
      id: `${synthesized.id}-rfb-${Date.now()}`,
    }
  }

  for (const candidate of rotateCandidates(candidates, referenceStepIndex)) {
    const promptKey = candidate.prompt.trim().toLowerCase()
    if (normalizedRecent.has(promptKey)) continue
    const fingerprint = buildPracticeQuestionFingerprintFromQuestion(candidate)
    if (fingerprint && seen.has(fingerprint)) continue
    const fresh = pickFreshReferencePracticeQuestion(
      [candidate],
      params.recentPrompts ?? [],
      params.seenKeys ?? [],
      recentTargetAnswers,
      recentInterlocutorLines,
      recentRoleIntroLines
    )
    if (!fresh) continue
    return {
      ...fresh,
      id: `${fresh.id}-rfb-${Date.now()}`,
    }
  }

  const freshFromPool = pickFreshReferencePracticeQuestion(
    candidates,
    params.recentPrompts ?? [],
    params.seenKeys ?? [],
    recentTargetAnswers,
    recentInterlocutorLines,
    recentRoleIntroLines
  )
  if (freshFromPool) {
    return {
      ...freshFromPool,
      id: `${freshFromPool.id}-rfb-${Date.now()}`,
    }
  }

  const base = candidates[referenceStepIndex % candidates.length] ?? candidates[0]!
  return buildSynthesizedReferenceFallback(base, referenceStepIndex, referenceTotal, seen)
}

/** Local reference session: one question per scenario index (debug loop). */
export function buildReferenceFallbackQuestions(params: {
  lesson: LessonData
  referenceExerciseType: PracticeExerciseType
  referenceTotal?: number
}): PracticeQuestion[] {
  const total = params.referenceTotal ?? 7
  const questions: PracticeQuestion[] = []
  const seenKeys: string[] = []
  const recentPrompts: string[] = []
  const recentTargetAnswers: string[] = []
  const recentInterlocutorLines: string[] = []
  const recentRoleIntroLines: string[] = []

  for (let index = 0; index < total; index += 1) {
    const question = buildReferenceFallbackQuestion({
      lesson: params.lesson,
      mode: 'reference',
      referenceExerciseType: params.referenceExerciseType,
      referenceStepIndex: index,
      referenceTotal: total,
      recentPrompts,
      seenKeys,
      recentTargetAnswers,
      recentInterlocutorLines,
      recentRoleIntroLines,
    })
    if (!question) break
    questions.push(question)
    recentPrompts.push(question.prompt)
    const fingerprint = buildPracticeQuestionFingerprintFromQuestion(question)
    if (fingerprint) seenKeys.push(fingerprint)
    if (params.referenceExerciseType === 'roleplay-mini') {
      recentTargetAnswers.push(...collectRecentTargetAnswers([question]))
      recentInterlocutorLines.push(...collectRecentInterlocutorLines([question]))
      recentRoleIntroLines.push(...collectRecentRoleIntroLines([question]))
    }
  }

  return questions
}
