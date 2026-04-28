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
import {
  buildLessonRouteCacheKey,
  createLessonRouteCorrelationId,
  logLessonRouteStages,
  logLessonRouteSummary,
  readLessonRouteCache,
  resolveLessonRouteMaxTokens,
  runLessonRouteInflight,
  writeLessonRouteCache,
} from '@/lib/lessonRouteRuntime'

type Body = {
  provider?: 'openrouter' | 'openai'
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  lessonId?: string
  recentVariantIds?: string[]
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const correlationId = req.headers.get('x-correlation-id')?.trim() || createLessonRouteCorrelationId('repeat')
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
  const audience = body.audience ?? 'adult'
  const cacheKey = buildLessonRouteCacheKey({
    mode: 'repeat',
    lessonId: lesson.id,
    selectedVariantId,
    audience,
    provider,
    openAiChatPreset,
  })
  const cacheReadStartedAt = Date.now()
  const cachedResponse = readLessonRouteCache<{ lesson: typeof lesson; generated: boolean; fallback: boolean }>(cacheKey)
  if (cachedResponse) {
    const responsePayload = {
      ...cachedResponse,
      lesson: cloneLessonWithNewRunKey(cachedResponse.lesson),
    }
    logLessonRouteSummary({
      correlationId,
      mode: 'repeat',
      lessonId: lesson.id,
      selectedVariantId,
      durationMs: Date.now() - startedAt,
      source: 'cache',
      generated: cachedResponse.generated,
      fallback: cachedResponse.fallback,
    })
    logLessonRouteStages({
      correlationId,
      mode: 'repeat',
      stages: {
        cache_read_ms: Date.now() - cacheReadStartedAt,
        total_ms: Date.now() - startedAt,
      },
    })
    return NextResponse.json(responsePayload, {
      headers: { 'x-correlation-id': correlationId },
    })
  }

  const system = [buildStructuredRepeatSystemPrompt(), buildStructuredLessonCefrPrompt({ lesson, audience })].join('\n\n')

  const user = JSON.stringify(
    {
      topic: lesson.topic,
      level: lesson.level,
      audience,
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

  const sharedResponse = await runLessonRouteInflight(cacheKey, async () => {
    const providerStartedAt = Date.now()
    const model = await callProviderChat({
      provider,
      req,
      apiMessages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      maxTokens: resolveLessonRouteMaxTokens(lesson.level, 'repeat'),
      openAiChatPreset,
      traceLabel: 'lesson-repeat',
    })

    if (!model.ok) {
      const responsePayload = { lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true }
      writeLessonRouteCache(cacheKey, responsePayload)
      logLessonRouteSummary({
        correlationId,
        mode: 'repeat',
        lessonId: lesson.id,
        selectedVariantId,
        durationMs: Date.now() - startedAt,
        source: 'provider',
        generated: false,
        fallback: true,
      })
      logLessonRouteStages({
        correlationId,
        mode: 'repeat',
        stages: {
          provider_ms: Date.now() - providerStartedAt,
          total_ms: Date.now() - startedAt,
        },
      })
      return responsePayload
    }

    const json = extractJsonObject(model.content)
    if (!json) {
      const responsePayload = { lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true }
      writeLessonRouteCache(cacheKey, responsePayload)
      logLessonRouteSummary({
        correlationId,
        mode: 'repeat',
        lessonId: lesson.id,
        selectedVariantId,
        durationMs: Date.now() - startedAt,
        source: 'provider',
        generated: false,
        fallback: true,
      })
      logLessonRouteStages({
        correlationId,
        mode: 'repeat',
        stages: {
          provider_ms: Date.now() - providerStartedAt,
          total_ms: Date.now() - startedAt,
        },
      })
      return responsePayload
    }

    try {
      const validationStartedAt = Date.now()
      const parsed = JSON.parse(json) as { steps?: unknown }
      const validation = assessGeneratedSteps(lesson, sourceRepeatableSteps, parsed.steps, { audience })
      if (!validation.validatedSteps) {
        console.warn(
          `lesson-repeat rejected lesson ${lesson.id} variant ${selectedVariantId ?? 'default'}: score=${validation.score.toFixed(2)}; ${formatLessonValidationIssues(validation.issues)}`
        )
        const responsePayload = { lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true }
        writeLessonRouteCache(cacheKey, responsePayload)
        logLessonRouteSummary({
          correlationId,
          mode: 'repeat',
          lessonId: lesson.id,
          selectedVariantId,
          durationMs: Date.now() - startedAt,
          source: 'provider',
          generated: false,
          fallback: true,
        })
        logLessonRouteStages({
          correlationId,
          mode: 'repeat',
          stages: {
            provider_ms: validationStartedAt - providerStartedAt,
            validation_ms: Date.now() - validationStartedAt,
            total_ms: Date.now() - startedAt,
          },
        })
        return responsePayload
      }
      const responsePayload = {
        lesson: buildLessonFromGeneratedSteps(lesson, validation.validatedSteps),
        generated: true,
        fallback: false,
      }
      writeLessonRouteCache(cacheKey, responsePayload)
      logLessonRouteSummary({
        correlationId,
        mode: 'repeat',
        lessonId: lesson.id,
        selectedVariantId,
        durationMs: Date.now() - startedAt,
        source: 'provider',
        generated: true,
        fallback: false,
      })
      logLessonRouteStages({
        correlationId,
        mode: 'repeat',
        stages: {
          provider_ms: validationStartedAt - providerStartedAt,
          validation_ms: Date.now() - validationStartedAt,
          total_ms: Date.now() - startedAt,
        },
      })
      return responsePayload
    } catch {
      const responsePayload = { lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true }
      writeLessonRouteCache(cacheKey, responsePayload)
      logLessonRouteSummary({
        correlationId,
        mode: 'repeat',
        lessonId: lesson.id,
        selectedVariantId,
        durationMs: Date.now() - startedAt,
        source: 'provider',
        generated: false,
        fallback: true,
      })
      logLessonRouteStages({
        correlationId,
        mode: 'repeat',
        stages: {
          provider_ms: Date.now() - providerStartedAt,
          total_ms: Date.now() - startedAt,
        },
      })
      return responsePayload
    }
  })

  const responsePayload = {
    ...sharedResponse,
    lesson: cloneLessonWithNewRunKey(sharedResponse.lesson),
  }

  return NextResponse.json(responsePayload, {
    headers: { 'x-correlation-id': correlationId },
  })
}
