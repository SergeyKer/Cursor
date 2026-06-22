import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
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

export function buildReferenceFallbackQuestion(params: BuildReferenceFallbackQuestionParams): PracticeQuestion | null {
  const referenceStepIndex = params.referenceStepIndex ?? 0
  const referenceTotal = params.referenceTotal ?? 7
  const normalizedRecent = new Set(
    (params.recentPrompts ?? [])
      .map((prompt) => prompt.trim().toLowerCase())
      .filter(Boolean)
  )
  const seen = new Set((params.seenKeys ?? []).filter(Boolean))
  const candidates = fallbackQuestions(params.lesson, params.mode).filter(
    (question) => question.type === params.referenceExerciseType
  )
  if (candidates.length === 0) return null

  for (const candidate of rotateCandidates(candidates, referenceStepIndex)) {
    const promptKey = candidate.prompt.trim().toLowerCase()
    if (normalizedRecent.has(promptKey)) continue
    const fingerprint = buildPracticeQuestionFingerprintFromQuestion(candidate)
    if (fingerprint && seen.has(fingerprint)) continue
    return {
      ...candidate,
      id: `${candidate.id}-rfb-${Date.now()}`,
    }
  }

  const base = candidates[referenceStepIndex % candidates.length] ?? candidates[0]!
  return buildSynthesizedReferenceFallback(base, referenceStepIndex, referenceTotal, seen)
}
