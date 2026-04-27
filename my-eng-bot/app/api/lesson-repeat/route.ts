import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import type { OpenAiChatPreset, Audience } from '@/lib/types'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { selectStructuredLessonVariant } from '@/lib/structuredLessonVariants'
import {
  assessGeneratedSteps,
  buildLessonFromGeneratedSteps,
  buildStructuredLessonCefrPrompt,
  buildStructuredRepeatSystemPrompt,
  cloneLessonWithNewRunKey,
  extractJsonObject,
  formatLessonValidationIssues,
} from '@/lib/structuredLessonFactory'

type Body = {
  provider?: 'openrouter' | 'openai'
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  lessonId?: string
  recentVariantIds?: string[]
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const baseLesson = body.lessonId ? getStructuredLessonById(body.lessonId) : null
  if (!baseLesson || !baseLesson.repeatConfig) {
    return NextResponse.json({ error: 'Нет данных structured-урока для повтора.' }, { status: 400 })
  }
  const recentVariantIds = Array.isArray(body.recentVariantIds)
    ? body.recentVariantIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const { lesson, selectedVariantId } = selectStructuredLessonVariant(baseLesson, recentVariantIds)
  const repeatConfig = lesson.repeatConfig
  if (!repeatConfig) {
    return NextResponse.json({ error: 'Нет repeatConfig для structured-урока.' }, { status: 400 })
  }

  const sourceRepeatableSteps = lesson.steps.filter((step) => step.stepType !== 'completion')
  if (!sourceRepeatableSteps.length) {
    return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
  }

  const provider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'

  const system = [buildStructuredRepeatSystemPrompt(), buildStructuredLessonCefrPrompt({ lesson, audience: body.audience ?? 'adult' })].join('\n\n')

  const user = JSON.stringify(
    {
      topic: lesson.topic,
      level: lesson.level,
      audience: body.audience ?? 'adult',
      repeatMode: 'change_situations_and_lexis_within_same_grammar_focus',
      selectedVariantId,
      ruleSummary: repeatConfig.ruleSummary,
      grammarFocus: repeatConfig.grammarFocus,
      sourceSituations: repeatConfig.sourceSituations,
      stepBlueprints: repeatConfig.stepBlueprints,
      sourceSteps: sourceRepeatableSteps.map((step) => ({
        stepNumber: step.stepNumber,
        stepType: step.stepType,
        bubbles: step.bubbles,
        exercise: step.exercise,
        footerDynamic: step.footerDynamic,
      })),
    },
    null,
    2
  )

  const model = await callProviderChat({
    provider,
    req,
    apiMessages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens: 1800,
    openAiChatPreset,
  })

  if (!model.ok) {
    return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
  }

  const json = extractJsonObject(model.content)
  if (!json) {
    return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
  }

  try {
    const parsed = JSON.parse(json) as { steps?: unknown }
    const validation = assessGeneratedSteps(lesson, sourceRepeatableSteps, parsed.steps, { audience: body.audience ?? 'adult' })
    if (!validation.validatedSteps) {
      console.warn(
        `lesson-repeat rejected lesson ${lesson.id} variant ${selectedVariantId ?? 'default'}: score=${validation.score.toFixed(2)}; ${formatLessonValidationIssues(validation.issues)}`
      )
      return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
    }
    return NextResponse.json({
      lesson: buildLessonFromGeneratedSteps(lesson, validation.validatedSteps),
      generated: true,
      fallback: false,
    })
  } catch {
    return NextResponse.json({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })
  }
}
