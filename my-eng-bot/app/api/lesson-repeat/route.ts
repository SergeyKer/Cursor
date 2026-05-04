import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import type { OpenAiChatPreset, Audience } from '@/lib/types'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { getLessonLearningSteps } from '@/lib/lessonFinale'
import { selectStructuredLessonVariant } from '@/lib/structuredLessonVariants'
import {
  assessGeneratedSteps,
  buildLessonRepairUserMessage,
  buildLessonFromGeneratedSteps,
  buildStructuredLessonCefrPrompt,
  buildStructuredRepeatSystemPrompt,
  buildStructuredVariantDiversifyInstruction,
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
import {
  LESSON_REPEAT_MENU_BYPASS_MAX_OUTPUT_TOKENS_CAP,
  resolveLessonRepeatMenuBypassMaxAttempts,
} from '@/lib/lessonProviderTimeouts'

type Body = {
  provider?: 'openrouter' | 'openai'
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  lessonId?: string
  recentVariantIds?: string[]
  bypassCache?: boolean
}

type LessonRepeatFallbackReason = 'provider' | 'parse' | 'validation' | 'exception' | 'no_steps'

export const maxDuration = 150

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

  const sourceRepeatableSteps = getLessonLearningSteps(lesson)
  if (!sourceRepeatableSteps.length) {
    return NextResponse.json({
      lesson: cloneLessonWithNewRunKey(lesson),
      generated: false,
      fallback: true,
      fallbackReason: 'no_steps' satisfies LessonRepeatFallbackReason,
    })
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
  const cachedResponse = readLessonRouteCache<{
    lesson: typeof lesson
    generated: boolean
    fallback: boolean
    fallbackReason?: LessonRepeatFallbackReason
  }>(cacheKey)
  if (!body.bypassCache && cachedResponse) {
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

  const system = [
    buildStructuredRepeatSystemPrompt(),
    buildStructuredVariantDiversifyInstruction(),
    buildStructuredLessonCefrPrompt({ lesson, audience }),
  ].join('\n\n')

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
    const shouldCacheFallback = !body.bypassCache
    const maxAttempts = body.bypassCache ? resolveLessonRepeatMenuBypassMaxAttempts() : 2
    const createFallbackPayload = (fallbackReason: LessonRepeatFallbackReason) => ({
      lesson: cloneLessonWithNewRunKey(lesson),
      generated: false,
      fallback: true,
      fallbackReason,
    })
    const maybeWriteFallbackCache = (responsePayload: ReturnType<typeof createFallbackPayload>) => {
      if (shouldCacheFallback) writeLessonRouteCache(cacheKey, responsePayload)
    }
    const logFallback = (stages: Record<string, number>) => {
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
          ...stages,
          total_ms: Date.now() - startedAt,
        },
      })
    }
    const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]

    const repeatBaseMaxTokens = resolveLessonRouteMaxTokens(lesson.level, 'repeat')
    const repeatMaxTokens = body.bypassCache
      ? Math.min(repeatBaseMaxTokens, LESSON_REPEAT_MENU_BYPASS_MAX_OUTPUT_TOKENS_CAP)
      : repeatBaseMaxTokens

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const providerStartedAt = Date.now()
      const model = await callProviderChat({
        provider,
        req,
        apiMessages,
        maxTokens: repeatMaxTokens,
        openAiChatPreset,
        traceLabel: 'lesson-repeat',
      })

      if (!model.ok) {
        if (attempt < maxAttempts) continue
        const responsePayload = createFallbackPayload('provider')
        maybeWriteFallbackCache(responsePayload)
        logFallback({
          attempts: attempt,
          provider_ms: Date.now() - providerStartedAt,
        })
        return responsePayload
      }

      const json = extractJsonObject(model.content)
      if (!json) {
        if (attempt < maxAttempts) {
          apiMessages.push({ role: 'assistant', content: model.content })
          apiMessages.push({
            role: 'user',
            content: buildLessonRepairUserMessage({
              reason: 'parse',
              attempt: attempt + 1,
              maxAttempts,
            }),
          })
          continue
        }
        const responsePayload = createFallbackPayload('parse')
        maybeWriteFallbackCache(responsePayload)
        logFallback({
          attempts: attempt,
          provider_ms: Date.now() - providerStartedAt,
        })
        return responsePayload
      }

      let parsed: { steps?: unknown }
      try {
        parsed = JSON.parse(json) as { steps?: unknown }
      } catch {
        if (attempt < maxAttempts) {
          apiMessages.push({ role: 'assistant', content: model.content })
          apiMessages.push({
            role: 'user',
            content: buildLessonRepairUserMessage({
              reason: 'parse',
              attempt: attempt + 1,
              maxAttempts,
            }),
          })
          continue
        }
        const responsePayload = createFallbackPayload('parse')
        maybeWriteFallbackCache(responsePayload)
        logFallback({
          attempts: attempt,
          provider_ms: Date.now() - providerStartedAt,
        })
        return responsePayload
      }

      const validationStartedAt = Date.now()
      const validation = assessGeneratedSteps(lesson, sourceRepeatableSteps, parsed.steps, { audience })
      if (!validation.validatedSteps) {
        console.warn(
          `lesson-repeat rejected lesson ${lesson.id} variant ${selectedVariantId ?? 'default'}: score=${validation.score.toFixed(2)}; ${formatLessonValidationIssues(validation.issues)}`
        )
        if (attempt < maxAttempts) {
          apiMessages.push({ role: 'assistant', content: json })
          apiMessages.push({
            role: 'user',
            content: buildLessonRepairUserMessage({
              reason: 'validation',
              attempt: attempt + 1,
              maxAttempts,
              issues: validation.issues,
              score: validation.score,
            }),
          })
          continue
        }
        const responsePayload = createFallbackPayload('validation')
        maybeWriteFallbackCache(responsePayload)
        logFallback({
          attempts: attempt,
          provider_ms: validationStartedAt - providerStartedAt,
          validation_ms: Date.now() - validationStartedAt,
        })
        return responsePayload
      }

      try {
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
            attempts: attempt,
            provider_ms: validationStartedAt - providerStartedAt,
            validation_ms: Date.now() - validationStartedAt,
            total_ms: Date.now() - startedAt,
          },
        })
        return responsePayload
      } catch {
        const responsePayload = createFallbackPayload('exception')
        maybeWriteFallbackCache(responsePayload)
        logFallback({
          attempts: attempt,
          provider_ms: Date.now() - providerStartedAt,
        })
        return responsePayload
      }
    }

    const responsePayload = createFallbackPayload('exception')
    maybeWriteFallbackCache(responsePayload)
    logFallback({ attempts: maxAttempts })
    return responsePayload
  })

  const responsePayload = {
    ...sharedResponse,
    lesson: cloneLessonWithNewRunKey(sharedResponse.lesson),
  }

  return NextResponse.json(responsePayload, {
    headers: { 'x-correlation-id': correlationId },
  })
}
