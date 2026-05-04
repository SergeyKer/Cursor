import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { getLessonLearningSteps } from '@/lib/lessonFinale'
import { selectStructuredLessonVariant } from '@/lib/structuredLessonVariants'
import {
  assessGeneratedSteps,
  buildLessonRepairUserMessage,
  buildLessonFromGeneratedSteps,
  buildStructuredLessonCefrPrompt,
  buildStructuredCreationSystemPrompt,
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
import type { OpenAiChatPreset, Audience } from '@/lib/types'

type Body = {
  provider?: 'openrouter' | 'openai'
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  lessonId?: string
  recentVariantIds?: string[]
}

export const maxDuration = 150

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const correlationId = req.headers.get('x-correlation-id')?.trim() || createLessonRouteCorrelationId('generate')
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const baseLesson = body.lessonId ? getStructuredLessonById(body.lessonId) : null
  if (!baseLesson || !baseLesson.repeatConfig) {
    return NextResponse.json({ error: 'Нет данных structured-урока для генерации.' }, { status: 400 })
  }
  const recentVariantIds = Array.isArray(body.recentVariantIds)
    ? body.recentVariantIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const { lesson, selectedVariantId } = selectStructuredLessonVariant(baseLesson, recentVariantIds)
  const repeatConfig = lesson.repeatConfig
  if (!repeatConfig) {
    return NextResponse.json({ error: 'Нет repeatConfig для structured-урока.' }, { status: 400 })
  }
  const sourceSteps = getLessonLearningSteps(lesson)

  const provider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'
  const audience = body.audience ?? 'adult'
  const cacheKey = buildLessonRouteCacheKey({
    mode: 'generate',
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
      mode: 'generate',
      lessonId: lesson.id,
      selectedVariantId,
      durationMs: Date.now() - startedAt,
      source: 'cache',
      generated: cachedResponse.generated,
      fallback: cachedResponse.fallback,
    })
    logLessonRouteStages({
      correlationId,
      mode: 'generate',
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
    buildStructuredCreationSystemPrompt(),
    buildStructuredVariantDiversifyInstruction(),
    buildStructuredLessonCefrPrompt({ lesson, audience }),
  ]
    .filter(Boolean)
    .join('\n\n')
  const user = JSON.stringify(
    {
      topic: lesson.topic,
      level: lesson.level,
      audience,
      generationMode: 'fresh_variant_required',
      selectedVariantId,
      ruleSummary: repeatConfig.ruleSummary,
      grammarFocus: repeatConfig.grammarFocus,
      sourceSituations: repeatConfig.sourceSituations,
      stepBlueprints: repeatConfig.stepBlueprints,
      sourceSteps: sourceSteps.map((step) => ({
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
    const maxAttempts = 2
    const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]
    const createFallbackPayload = () => ({ lesson: cloneLessonWithNewRunKey(lesson), generated: false, fallback: true })

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const providerStartedAt = Date.now()
      const model = await callProviderChat({
        provider,
        req,
        apiMessages,
        maxTokens: resolveLessonRouteMaxTokens(lesson.level, 'generate'),
        openAiChatPreset,
        traceLabel: 'lesson-generate',
      })

      if (!model.ok) {
        if (attempt < maxAttempts) continue
        const responsePayload = createFallbackPayload()
        writeLessonRouteCache(cacheKey, responsePayload)
        logLessonRouteSummary({
          correlationId,
          mode: 'generate',
          lessonId: lesson.id,
          selectedVariantId,
          durationMs: Date.now() - startedAt,
          source: 'provider',
          generated: false,
          fallback: true,
        })
        logLessonRouteStages({
          correlationId,
          mode: 'generate',
          stages: {
            attempts: attempt,
            provider_ms: Date.now() - providerStartedAt,
            total_ms: Date.now() - startedAt,
          },
        })
        return responsePayload
      }

      const json = extractJsonObject(model.content)
      if (!json) {
        if (attempt < maxAttempts) {
          apiMessages.push({ role: 'assistant', content: model.content })
          apiMessages.push({
            role: 'user',
            content: buildLessonRepairUserMessage({ reason: 'parse', attempt: attempt + 1, maxAttempts }),
          })
          continue
        }
        const responsePayload = createFallbackPayload()
        writeLessonRouteCache(cacheKey, responsePayload)
        logLessonRouteSummary({
          correlationId,
          mode: 'generate',
          lessonId: lesson.id,
          selectedVariantId,
          durationMs: Date.now() - startedAt,
          source: 'provider',
          generated: false,
          fallback: true,
        })
        logLessonRouteStages({
          correlationId,
          mode: 'generate',
          stages: {
            attempts: attempt,
            provider_ms: Date.now() - providerStartedAt,
            total_ms: Date.now() - startedAt,
          },
        })
        return responsePayload
      }

      try {
        const validationStartedAt = Date.now()
        const parsed = JSON.parse(json) as { steps?: unknown }
        const validation = assessGeneratedSteps(lesson, sourceSteps, parsed.steps, { audience })
        if (!validation.validatedSteps) {
          console.warn(
            `structured-lesson-generate rejected lesson ${lesson.id} variant ${selectedVariantId ?? 'default'}: score=${validation.score.toFixed(2)}; ${formatLessonValidationIssues(validation.issues)}`
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
          const responsePayload = createFallbackPayload()
          logLessonRouteSummary({
            correlationId,
            mode: 'generate',
            lessonId: lesson.id,
            selectedVariantId,
            durationMs: Date.now() - startedAt,
            source: 'provider',
            generated: false,
            fallback: true,
          })
          logLessonRouteStages({
            correlationId,
            mode: 'generate',
            stages: {
              attempts: attempt,
              provider_ms: validationStartedAt - providerStartedAt,
              validation_ms: Date.now() - validationStartedAt,
              total_ms: Date.now() - startedAt,
            },
          })
          return responsePayload
        }

        const responsePayload = {
          lesson: buildLessonFromGeneratedSteps({ ...lesson, steps: sourceSteps }, validation.validatedSteps),
          generated: true,
          fallback: false,
        }
        writeLessonRouteCache(cacheKey, responsePayload)
        logLessonRouteSummary({
          correlationId,
          mode: 'generate',
          lessonId: lesson.id,
          selectedVariantId,
          durationMs: Date.now() - startedAt,
          source: 'provider',
          generated: true,
          fallback: false,
        })
        logLessonRouteStages({
          correlationId,
          mode: 'generate',
          stages: {
            attempts: attempt,
            provider_ms: validationStartedAt - providerStartedAt,
            validation_ms: Date.now() - validationStartedAt,
            total_ms: Date.now() - startedAt,
          },
        })
        return responsePayload
      } catch {
        if (attempt < maxAttempts) {
          apiMessages.push({ role: 'assistant', content: model.content })
          apiMessages.push({
            role: 'user',
            content: buildLessonRepairUserMessage({ reason: 'parse', attempt: attempt + 1, maxAttempts }),
          })
          continue
        }
        const responsePayload = createFallbackPayload()
        writeLessonRouteCache(cacheKey, responsePayload)
        logLessonRouteSummary({
          correlationId,
          mode: 'generate',
          lessonId: lesson.id,
          selectedVariantId,
          durationMs: Date.now() - startedAt,
          source: 'provider',
          generated: false,
          fallback: true,
        })
        logLessonRouteStages({
          correlationId,
          mode: 'generate',
          stages: {
            attempts: attempt,
            provider_ms: Date.now() - providerStartedAt,
            total_ms: Date.now() - startedAt,
          },
        })
        return responsePayload
      }
    }

    const responsePayload = createFallbackPayload()
    logLessonRouteSummary({
      correlationId,
      mode: 'generate',
      lessonId: lesson.id,
      selectedVariantId,
      durationMs: Date.now() - startedAt,
      source: 'provider',
      generated: false,
      fallback: true,
    })
    logLessonRouteStages({
      correlationId,
      mode: 'generate',
      stages: {
        attempts: maxAttempts,
        total_ms: Date.now() - startedAt,
      },
    })
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
