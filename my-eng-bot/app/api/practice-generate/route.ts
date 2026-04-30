import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { getPracticeModePlan } from '@/lib/practice/engine/sessionPlan'
import { getPracticeExerciseMetadata } from '@/lib/practice/registry'
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
  return value === 'relaxed' || value === 'balanced' || value === 'challenge'
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

function normalizeQuestion(row: unknown, lesson: LessonData, index: number): PracticeQuestion | null {
  if (!row || typeof row !== 'object') return null
  const source = row as Record<string, unknown>
  const type = isPracticeExerciseType(source.type) ? source.type : null
  const prompt = typeof source.prompt === 'string' ? source.prompt.trim() : ''
  const targetAnswer = typeof source.targetAnswer === 'string' ? source.targetAnswer.trim() : ''
  if (!type || !prompt || !targetAnswer) return null

  const meta = getPracticeExerciseMetadata(type)
  const acceptedAnswers = Array.isArray(source.acceptedAnswers)
    ? source.acceptedAnswers.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const options = Array.isArray(source.options)
    ? source.options.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
    : undefined
  const shuffledWords = Array.isArray(source.shuffledWords)
    ? source.shuffledWords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined
  const extraWords = Array.isArray(source.extraWords)
    ? source.extraWords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined
  const keywords = Array.isArray(source.keywords)
    ? source.keywords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined

  return {
    id: `ai-practice-${lesson.id}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    lessonId: lesson.id,
    type,
    prompt,
    targetAnswer,
    acceptedAnswers: Array.from(new Set([targetAnswer, ...acceptedAnswers])),
    options: options && options.length >= 2 ? options : undefined,
    shuffledWords: shuffledWords && shuffledWords.length > 0 ? shuffledWords : undefined,
    extraWords: extraWords && extraWords.length > 0 ? extraWords : undefined,
    audioText: typeof source.audioText === 'string' ? source.audioText.trim() : targetAnswer,
    keywords: keywords && keywords.length > 0 ? keywords : undefined,
    minWords: typeof source.minWords === 'number' && source.minWords > 0 ? Math.min(20, source.minWords) : undefined,
    hint: typeof source.hint === 'string' ? source.hint.trim() : undefined,
    explanation: typeof source.explanation === 'string' ? source.explanation.trim() : undefined,
    correctionPrompt: `Закрепим правильный вариант: ${targetAnswer}`,
    xpBase: meta.xpBase,
    difficulty: meta.difficulty,
    tolerance: meta.tolerance,
  }
}

function normalizeQuestions(rawQuestions: unknown, lesson: LessonData, mode: PracticeMode): PracticeQuestion[] {
  if (!Array.isArray(rawQuestions)) return []
  const plan = getPracticeModePlan(mode)
  const allowedTypes = new Set(plan.types)
  const questions = rawQuestions
    .slice(0, plan.length)
    .map((row, index) => normalizeQuestion(row, lesson, index))
    .filter((question): question is PracticeQuestion => Boolean(question))
    .filter((question) => allowedTypes.has(question.type) || (plan.boss && question.type === 'boss-challenge'))

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

function buildUserPayload(lesson: LessonData, mode: PracticeMode, audience: Audience): string {
  const plan = getPracticeModePlan(mode)
  return JSON.stringify(
    {
      topic: lesson.topic,
      level: lesson.level,
      audience,
      mode,
      length: plan.length,
      allowedTypes: plan.types,
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
  const lesson = body.lesson ?? (body.lessonId ? getStructuredLessonById(body.lessonId) : null)
  if (!lesson) {
    return NextResponse.json({ error: 'Нет данных урока для практики.' }, { status: 400 })
  }

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
        { role: 'user', content: buildUserPayload(lesson, mode, audience) },
      ],
      maxTokens: 2800,
      openAiChatPreset,
      traceLabel: 'practice-generate',
    })

    if (!model.ok) {
      return NextResponse.json(createFallback('provider'))
    }

    const json = extractJsonObject(model.content)
    if (!json) {
      return NextResponse.json(createFallback('parse'))
    }

    let parsed: { questions?: unknown }
    try {
      parsed = JSON.parse(json) as { questions?: unknown }
    } catch {
      return NextResponse.json(createFallback('parse'))
    }

    const questions = normalizeQuestions(parsed.questions, lesson, mode)
    if (questions.length === 0) {
      return NextResponse.json(createFallback('validation'))
    }

    return NextResponse.json({
      questions,
      generated: true,
      fallback: false,
    })
  } catch {
    return NextResponse.json(createFallback('exception'))
  }
}

