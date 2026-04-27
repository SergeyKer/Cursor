import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  assessGeneratedSteps,
  buildLessonFromGeneratedSteps,
  buildStructuredLessonCefrPrompt,
  buildStructuredCreationSystemPrompt,
  cloneLessonWithNewRunKey,
  extractJsonObject,
  formatLessonValidationIssues,
} from '@/lib/structuredLessonFactory'
import type { OpenAiChatPreset, Audience } from '@/lib/types'

type Body = {
  provider?: 'openrouter' | 'openai'
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  lessonId?: string
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const lesson = body.lessonId ? getStructuredLessonById(body.lessonId) : null
  if (!lesson || !lesson.repeatConfig) {
    return NextResponse.json({ error: 'Нет данных structured-урока для генерации.' }, { status: 400 })
  }

  const provider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'

  const mustDiversifyFromTemplate = lesson.id === '2'
  const diversifyInstruction = mustDiversifyFromTemplate
    ? 'Для этого урока обязательно сгенерируй новый вариант: не копируй дословно sourceSteps, поменяй формулировки, имена, существительные и микро-ситуации, сохранив тот же grammar focus и шаги.'
    : ''
  const system = [
    buildStructuredCreationSystemPrompt(),
    diversifyInstruction,
    buildStructuredLessonCefrPrompt({ lesson, audience: body.audience ?? 'adult' }),
  ]
    .filter(Boolean)
    .join('\n\n')
  const user = JSON.stringify(
    {
      topic: lesson.topic,
      level: lesson.level,
      audience: body.audience ?? 'adult',
      generationMode: mustDiversifyFromTemplate ? 'fresh_variant_required' : 'default',
      ruleSummary: lesson.repeatConfig.ruleSummary,
      grammarFocus: lesson.repeatConfig.grammarFocus,
      sourceSituations: lesson.repeatConfig.sourceSituations,
      stepBlueprints: lesson.repeatConfig.stepBlueprints,
      sourceSteps: lesson.steps.map((step) => ({
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
    maxTokens: 2200,
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
    const validation = assessGeneratedSteps(lesson, lesson.steps, parsed.steps, { audience: body.audience ?? 'adult' })
    if (!validation.validatedSteps) {
      console.warn(
        `structured-lesson-generate rejected lesson ${lesson.id}: score=${validation.score.toFixed(2)}; ${formatLessonValidationIssues(validation.issues)}`
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
