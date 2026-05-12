import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { getPracticeModePlan } from '@/lib/practice/engine/sessionPlan'
import { buildPracticeQuestionFingerprintFromQuestion, normalizePracticeFingerprintPart } from '@/lib/practice/questionFingerprint'
import { normalizeAiPracticeQuestion } from '@/lib/practice/normalizeAiPracticeQuestion'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { AiProvider, Audience, OpenAiChatPreset } from '@/lib/types'
import type { LessonData } from '@/types/lesson'
import type { PracticeExerciseType, PracticeMode, PracticeQuestion } from '@/types/practice'

type Body = {
  provider?: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  lessonId?: string
  lesson?: LessonData
  mode?: PracticeMode
  referenceExerciseType?: PracticeExerciseType
  referenceStepIndex?: number
  referenceTotal?: number
  recentPrompts?: string[]
  count?: number
  fromIndex?: number
  seenKeys?: string[]
}

type PracticeGenerateFallbackReason = 'provider' | 'parse' | 'validation' | 'exception' | 'no_lesson'
const MAX_GENERATE_ATTEMPTS = 2

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function isPracticeMode(value: unknown): value is PracticeMode {
  return value === 'relaxed' || value === 'balanced' || value === 'challenge' || value === 'reference'
}

function isPracticeExerciseType(value: unknown): value is PracticeExerciseType {
  return (
    value === 'choice' ||
    value === 'voice-shadow' ||
    value === 'dropdown-fill' ||
    value === 'listening-select' ||
    value === 'sentence-surgery' ||
    value === 'free-response' ||
    value === 'word-builder-pro' ||
    value === 'dictation' ||
    value === 'roleplay-mini' ||
    value === 'boss-challenge' ||
    value === 'speed-round' ||
    value === 'context-clue'
  )
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

function buildReferenceFallbackQuestion(params: {
  lesson: LessonData
  mode: PracticeMode
  referenceExerciseType: PracticeExerciseType
  recentPrompts?: string[]
  seenKeys?: string[]
}): PracticeQuestion | null {
  const normalizedRecent = new Set(
    (params.recentPrompts ?? [])
      .map((prompt) => prompt.trim().toLowerCase())
      .filter(Boolean)
  )
  const seen = new Set((params.seenKeys ?? []).filter(Boolean))
  const candidates = fallbackQuestions(params.lesson, params.mode).filter(
    (question) => question.type === params.referenceExerciseType
  )
  for (const candidate of candidates) {
    const promptKey = candidate.prompt.trim().toLowerCase()
    if (normalizedRecent.has(promptKey)) continue
    const fingerprint = buildPracticeQuestionFingerprintFromQuestion(candidate)
    if (fingerprint && seen.has(fingerprint)) continue
    return {
      ...candidate,
      id: `${candidate.id}-rfb-${Date.now()}`,
    }
  }
  const first = candidates[0]
  if (!first) return null
  return {
    ...first,
    id: `${first.id}-rfb-${Date.now()}`,
  }
}

function normalizeQuestions(
  rawQuestions: unknown,
  lesson: LessonData,
  mode: PracticeMode,
  requestedCount: number,
  referenceExerciseType?: PracticeExerciseType,
  recentPrompts: string[] = []
): PracticeQuestion[] {
  if (!Array.isArray(rawQuestions)) return []
  const plan = getPracticeModePlan(mode)
  const clampedCount = Math.max(1, Math.min(requestedCount, plan.length))
  const allowedTypes = new Set(plan.types)
  const normalized = rawQuestions
    .slice(0, plan.length)
    .map((row, index) => normalizeAiPracticeQuestion(row, lesson, index))
    .filter((question): question is PracticeQuestion => Boolean(question))
  const questions =
    mode === 'reference'
      ? normalized
      : normalized.filter((question) => allowedTypes.has(question.type) || (plan.boss && question.type === 'boss-challenge'))

  if (mode === 'reference') {
    const normalizedRecent = recentPrompts.map((prompt) => prompt.trim().toLowerCase()).filter(Boolean)
    const filteredByType = referenceExerciseType ? questions.filter((question) => question.type === referenceExerciseType) : []
    const fresh =
      filteredByType.find((question) => !normalizedRecent.includes(question.prompt.trim().toLowerCase())) ?? filteredByType[0]
    if (!fresh) return []
    return [{ ...fresh, id: `${fresh.id}-r${Date.now()}` }].slice(0, clampedCount)
  }

  if (questions.length === 0) return []
  if (plan.boss && clampedCount === plan.length && questions.at(-1)?.type !== 'boss-challenge') {
    const boss = questions.find((question) => question.type === 'boss-challenge')
    if (boss) {
      return [...questions.filter((question) => question.id !== boss.id), boss].slice(0, plan.length)
    }
  }
  return questions.slice(0, clampedCount)
}

function buildSystemPrompt(): string {
  return [
    'You generate short English practice exercises for a learner app.',
    'Return ONLY valid JSON object: {"questions":[...]}',
    'Each question must have: type, prompt, targetAnswer, acceptedAnswers, shuffledWords, audioText, keywords, minWords, hint, explanation.',
    'If type is choice, dropdown-fill, listening-select, speed-round, or context-clue, you must provide at least 2 English options and include targetAnswer in the options.',
    'Do not omit options for choice-like question types.',
    'All English answers and options must be natural, grammatical English. Wrong options may be incorrect for the task, but never nonsense or broken phrases like "It\'s dark to go.".',
    'Prompts can be in Russian with English targets. Keep the tone warm and concise.',
    'If referenceExerciseType is provided, every generated question.type must exactly match it.',
    'Do not include markdown.',
  ].join('\n')
}

function buildUserPayload(
  lesson: LessonData,
  mode: PracticeMode,
  audience: Audience,
  count: number,
  fromIndex: number,
  seenKeys: string[],
  referenceExerciseType?: PracticeExerciseType,
  referenceStepIndex?: number,
  referenceTotal?: number,
  recentPrompts: string[] = []
): string {
  const plan = getPracticeModePlan(mode)
  return JSON.stringify(
    {
      topic: lesson.topic,
      level: lesson.level,
      audience,
      mode,
      length: mode === 'reference' ? 1 : count,
      fromIndex,
      allowedTypes: plan.types,
      seenKeys: seenKeys.slice(-40),
      referenceExerciseType: mode === 'reference' ? referenceExerciseType : undefined,
      referenceStepIndex: mode === 'reference' ? referenceStepIndex : undefined,
      referenceTotal: mode === 'reference' ? referenceTotal : undefined,
      recentPrompts: mode === 'reference' ? recentPrompts.slice(-3) : undefined,
      diversityRule:
        mode === 'reference'
          ? 'Generate a new wording and scenario different from recentPrompts while keeping the same exercise type.'
          : 'Avoid repeating seenKeys and generate fresh prompts and answers.',
      mustEndWithBossChallenge: plan.boss,
      sourceExercises: lesson.steps
        .filter((step) => step.exercise)
        .map((step) => ({
          bubbles: step.bubbles.slice(-1),
          exercise: step.exercise,
        })),
    },
    null,
    2
  )
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const mode = isPracticeMode(body.mode) ? body.mode : 'relaxed'
  const plan = getPracticeModePlan(mode)
  const referenceExerciseType = isPracticeExerciseType(body.referenceExerciseType) ? body.referenceExerciseType : undefined
  const referenceStepIndex = Number.isFinite(body.referenceStepIndex) ? Math.max(0, Number(body.referenceStepIndex)) : 0
  const referenceTotal = Number.isFinite(body.referenceTotal) ? Math.max(1, Number(body.referenceTotal)) : 7
  const fromIndex = Number.isFinite(body.fromIndex) ? Math.max(0, Number(body.fromIndex)) : 0
  const requestedCount = Number.isFinite(body.count)
    ? Math.max(1, Math.min(plan.length, Number(body.count)))
    : mode === 'reference'
      ? 1
      : plan.length
  const recentPrompts = Array.isArray(body.recentPrompts)
    ? body.recentPrompts.filter((item): item is string => typeof item === 'string')
    : []
  const seenKeys = Array.isArray(body.seenKeys)
    ? body.seenKeys
        .filter((item): item is string => typeof item === 'string')
        .map((item) => normalizePracticeFingerprintPart(item))
        .filter(Boolean)
        .slice(-80)
    : []
  const lesson = body.lesson ?? (body.lessonId ? getStructuredLessonById(body.lessonId) : null)
  if (!lesson) {
    return NextResponse.json({ error: 'Нет данных урока для практики.' }, { status: 400 })
  }
  if (mode === 'reference' && !referenceExerciseType) {
    return NextResponse.json({ error: 'Для эталона нужно выбрать тип упражнения.' }, { status: 422 })
  }

  const createReferenceError = (fallbackReason: PracticeGenerateFallbackReason) =>
    NextResponse.json(
      {
        error: 'Эталонный режим временно недоступен: генерация ИИ не вернула валидный набор упражнений.',
        fallback: false,
        fallbackReason,
      },
      { status: 502 }
    )

  const createFallback = (fallbackReason: PracticeGenerateFallbackReason) => ({
    questions: fallbackQuestions(lesson, mode).slice(fromIndex, fromIndex + requestedCount),
    generated: false,
    fallback: true,
    fallbackReason,
  })

  const provider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'
  const audience = body.audience ?? 'adult'

  try {
    const accumulated: PracticeQuestion[] = []
    const usedFingerprints = new Set(seenKeys)
    let fallbackReason: PracticeGenerateFallbackReason = 'validation'

    for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS && accumulated.length < requestedCount; attempt += 1) {
      const model = await callProviderChat({
        provider,
        req,
        apiMessages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content: buildUserPayload(
              lesson,
              mode,
              audience,
              requestedCount,
              fromIndex + accumulated.length,
              Array.from(usedFingerprints),
              referenceExerciseType,
              referenceStepIndex,
              referenceTotal,
              recentPrompts
            ),
          },
        ],
        maxTokens: mode === 'reference' ? 700 : Math.min(2200, Math.max(550, requestedCount * 420)),
        openAiChatPreset,
        traceLabel: 'practice-generate',
      })

      if (!model.ok) {
        fallbackReason = 'provider'
        continue
      }

      const json = extractJsonObject(model.content)
      if (!json) {
        fallbackReason = 'parse'
        continue
      }

      let parsed: { questions?: unknown }
      try {
        parsed = JSON.parse(json) as { questions?: unknown }
      } catch {
        fallbackReason = 'parse'
        continue
      }

      const candidates = normalizeQuestions(
        parsed.questions,
        lesson,
        mode,
        requestedCount,
        referenceExerciseType,
        recentPrompts
      )
      if (candidates.length === 0) {
        fallbackReason = 'validation'
        continue
      }

      for (const candidate of candidates) {
        const fingerprint = buildPracticeQuestionFingerprintFromQuestion(candidate)
        if (!fingerprint || usedFingerprints.has(fingerprint)) continue
        usedFingerprints.add(fingerprint)
        accumulated.push({
          ...candidate,
          id: `${candidate.id}-g${Date.now()}-${attempt}-${accumulated.length}`,
        })
        if (accumulated.length >= requestedCount) break
      }
      if (accumulated.length > 0 && mode === 'reference') break
    }

    if (accumulated.length === 0) {
      if (mode === 'reference' && referenceExerciseType) {
        const referenceFallback = buildReferenceFallbackQuestion({
          lesson,
          mode,
          referenceExerciseType,
          recentPrompts,
          seenKeys,
        })
        if (referenceFallback) {
          return NextResponse.json({
            questions: [referenceFallback],
            generated: false,
            fallback: true,
            fallbackReason,
          })
        }
        return NextResponse.json(
          {
            error: `ИИ не вернул упражнение типа "${referenceExerciseType}". Перегенерируйте вариант.`,
            fallback: false,
            fallbackReason,
          },
          { status: 422 }
        )
      }
      return mode === 'reference' ? createReferenceError(fallbackReason) : NextResponse.json(createFallback(fallbackReason))
    }

    return NextResponse.json({
      questions: accumulated,
      generated: true,
      fallback: false,
    })
  } catch {
    return mode === 'reference' ? createReferenceError('exception') : NextResponse.json(createFallback('exception'))
  }
}

