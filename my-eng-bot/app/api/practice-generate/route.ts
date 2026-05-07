import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { getPracticeModePlan } from '@/lib/practice/engine/sessionPlan'
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
}

type PracticeGenerateFallbackReason = 'provider' | 'parse' | 'validation' | 'exception' | 'no_lesson'

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

function normalizeQuestions(
  rawQuestions: unknown,
  lesson: LessonData,
  mode: PracticeMode,
  referenceExerciseType?: PracticeExerciseType,
  recentPrompts: string[] = []
): PracticeQuestion[] {
  if (!Array.isArray(rawQuestions)) return []
  const plan = getPracticeModePlan(mode)
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
    return [{ ...fresh, id: `${fresh.id}-r${Date.now()}` }]
  }

  if (questions.length < Math.min(4, plan.length)) return []
  if (plan.boss && questions.at(-1)?.type !== 'boss-challenge') {
    const boss = questions.find((question) => question.type === 'boss-challenge')
    if (boss) {
      return [...questions.filter((question) => question.id !== boss.id), boss].slice(0, plan.length)
    }
  }
  return questions.slice(0, plan.length)
}

function buildSystemPrompt(): string {
  return [
    'You generate short English practice exercises for a learner app.',
    'Return ONLY valid JSON object: {"questions":[...]}',
    'Each question must have: type, prompt, targetAnswer, acceptedAnswers, optional options, shuffledWords, audioText, keywords, minWords, hint, explanation.',
    'Prompts can be in Russian with English targets. Keep the tone warm and concise.',
    'Do not include markdown.',
  ].join('\n')
}

function buildUserPayload(
  lesson: LessonData,
  mode: PracticeMode,
  audience: Audience,
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
      length: mode === 'reference' ? 1 : plan.length,
      allowedTypes: plan.types,
      referenceExerciseType: mode === 'reference' ? referenceExerciseType : undefined,
      referenceStepIndex: mode === 'reference' ? referenceStepIndex : undefined,
      referenceTotal: mode === 'reference' ? referenceTotal : undefined,
      recentPrompts: mode === 'reference' ? recentPrompts.slice(-3) : undefined,
      diversityRule:
        mode === 'reference'
          ? 'Generate a new wording and scenario different from recentPrompts while keeping the same exercise type.'
          : undefined,
      mustEndWithBossChallenge: plan.boss,
      sourceExercises: lesson.steps
        .filter((step) => step.exercise)
        .map((step) => ({
          bubbles: step.bubbles,
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
  const referenceExerciseType = isPracticeExerciseType(body.referenceExerciseType) ? body.referenceExerciseType : undefined
  const referenceStepIndex = Number.isFinite(body.referenceStepIndex) ? Math.max(0, Number(body.referenceStepIndex)) : 0
  const referenceTotal = Number.isFinite(body.referenceTotal) ? Math.max(1, Number(body.referenceTotal)) : 7
  const recentPrompts = Array.isArray(body.recentPrompts)
    ? body.recentPrompts.filter((item): item is string => typeof item === 'string')
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
    questions: fallbackQuestions(lesson, mode),
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
    const model = await callProviderChat({
      provider,
      req,
      apiMessages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: buildUserPayload(lesson, mode, audience, referenceExerciseType, referenceStepIndex, referenceTotal, recentPrompts),
        },
      ],
      maxTokens: mode === 'reference' ? 800 : 2800,
      openAiChatPreset,
      traceLabel: 'practice-generate',
    })

    if (!model.ok) {
      return mode === 'reference' ? createReferenceError('provider') : NextResponse.json(createFallback('provider'))
    }

    const json = extractJsonObject(model.content)
    if (!json) {
      return mode === 'reference' ? createReferenceError('parse') : NextResponse.json(createFallback('parse'))
    }

    let parsed: { questions?: unknown }
    try {
      parsed = JSON.parse(json) as { questions?: unknown }
    } catch {
      return mode === 'reference' ? createReferenceError('parse') : NextResponse.json(createFallback('parse'))
    }

    const questions = normalizeQuestions(parsed.questions, lesson, mode, referenceExerciseType, recentPrompts)
    if (questions.length === 0) {
      if (mode === 'reference' && referenceExerciseType) {
        return NextResponse.json(
          {
            error: `ИИ не вернул упражнение типа "${referenceExerciseType}". Перегенерируйте вариант.`,
            fallback: false,
            fallbackReason: 'validation',
          },
          { status: 422 }
        )
      }
      return mode === 'reference' ? createReferenceError('validation') : NextResponse.json(createFallback('validation'))
    }

    return NextResponse.json({
      questions,
      generated: true,
      fallback: false,
    })
  } catch {
    return mode === 'reference' ? createReferenceError('exception') : NextResponse.json(createFallback('exception'))
  }
}

