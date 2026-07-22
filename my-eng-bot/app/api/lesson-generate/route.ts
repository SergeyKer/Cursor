import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import type { AiProvider } from '@/lib/types'
import { hasRequiredTheoryStructure, isValidLessonBlueprint, type TutorAdaptiveTemplate } from '@/lib/lessonBlueprint'
import { buildFallbackLessonIntro } from '@/lib/lessonIntro'
import {
  buildFallbackTutorLearningIntent,
  buildLessonIntroFromTutorIntent,
  createTutorLearningIntentCacheKey,
  normalizeTutorLearningIntent,
  type TutorLearningIntent,
} from '@/lib/tutorLearningIntent'
import {
  buildLessonBlueprintCacheKey,
  createLessonRouteCorrelationId,
  logLessonRouteStages,
  logLessonRouteSummary,
  readLessonRouteCache,
  runLessonRouteInflight,
  writeLessonRouteCache,
} from '@/lib/lessonRouteRuntime'
import {
  buildReviewChipLessonSystemPrompt,
  buildReviewChipLessonUserPayload,
  buildReviewChipNamespacedCacheTopic,
} from '@/lib/lessonGenerate/reviewChipLessonPrompt'
import { coerceReviewChipBlueprint } from '@/lib/lessonGenerate/coerceReviewChipBlueprint'
import type { LanguageNote, LanguageNoteReviewTopic } from '@/lib/languageNote/types'
import type { LessonBlueprint } from '@/lib/lessonBlueprint'

export const maxDuration = 150

const REVIEW_CHIP_GENERATE_ERROR = 'Не удалось собрать шпаргалку по теме. Попробуй ещё раз.'

type Body = {
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  topic?: string
  originalQuery?: string
  intent?: unknown
  level?: string
  audience?: string
  analysisSummary?: string
  /** Chip → reference generate path: use review-chip pedagogy prompt. */
  source?: 'language_note_review' | string
  reviewChip?: {
    title?: string
    original?: string
    correct?: string
    correctReasons?: string[]
  }
}

type BlueprintOkPayload = {
  lesson: Record<string, unknown>
  generated: boolean
  fallback: boolean
}

type InflightResult =
  | { kind: 'ok'; payload: BlueprintOkPayload }
  | { kind: 'review_fail'; error: string }

function normalizeTheoryIntro(raw: string): string {
  const markers = ['**Урок:**', '**Правило:**', '**Примеры:**', '**Коротко:**', '**Шаблоны:**']
  let text = raw.replace(/\r\n/g, '\n').trim()
  for (const marker of markers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text.replace(new RegExp(`\\s*${escaped}\\s*`, 'g'), `\n${marker} `)
  }
  // Убираем лишний пробел после заголовка перед переносом, если заголовок отдельной строкой.
  text = text.replace(/\n(\*\*[^\n]+:\*\*)\s*\n/g, '\n$1\n')
  return text.trim()
}

function defaultLesson(topic: string, intent?: TutorLearningIntent | null) {
  const safeTopic = topic.trim() || 'выбранной теме'
  const resolvedIntent = intent ?? buildFallbackTutorLearningIntent(safeTopic)
  const intro = intent ? buildLessonIntroFromTutorIntent(intent) : buildFallbackLessonIntro(safeTopic)
  const normalizedTopic = safeTopic.toLowerCase()
  const contrastPair =
    normalizedTopic.includes('present perfect') && normalizedTopic.includes('past simple')
      ? (['Present Perfect', 'Past Simple'] as [string, string])
      : undefined
  const adaptiveTemplate: TutorAdaptiveTemplate = {
    grammarFocus: contrastPair ? [...contrastPair] : resolvedIntent.mustTrain.length ? resolvedIntent.mustTrain : [safeTopic],
    ...(contrastPair ? { contrastPair } : {}),
    recommendedStartDifficulty: 'easy',
    preferredExerciseModes: contrastPair ? ['contrast', 'drill', 'production', 'micro_quiz'] : ['drill', 'production', 'micro_quiz'],
    supportsAdaptiveVariants: true,
  }
  return {
    title: `Тема: ${safeTopic}`,
    intro,
    theoryIntro:
      `**Урок:** ${safeTopic}\n` +
      '**Правило:**\n' +
      `1) ${resolvedIntent.goalRu}\n` +
      `2) Первый шаг: ${resolvedIntent.firstPracticeGoalRu}\n` +
      '**Примеры:**\n' +
      resolvedIntent.examples
        .slice(0, 2)
        .map((example, index) => `${index + 1}) ${example.en} - ${example.ru}.`)
        .join('\n') +
      '\n' +
      `**Коротко:** ${resolvedIntent.firstPracticeGoalRu}\n` +
      '**Шаблоны:**\n' +
      resolvedIntent.targetPatterns
        .slice(0, 3)
        .map((pattern, index) => `${index + 1}) ${pattern}`)
        .join('\n'),
    actions: [
      { id: 'examples', label: 'Посмотри примеры' },
      { id: 'fill_phrase', label: 'Подставь слово' },
      { id: 'repeat_translate', label: 'Переведи на английский' },
      { id: 'write_own_sentence', label: 'Напиши своё предложение' },
    ],
    followups: {
      examples: `**Примеры по теме "${safeTopic}":**\n${resolvedIntent.examples.map((example, index) => `${index + 1}) ${example.en} - ${example.ru}`).join('\n')}`,
      fill_phrase: `**Подставь слово:**\n1) ${resolvedIntent.examples[0]?.en ?? `Use ${safeTopic}.`}\n2) Шаблон: ${resolvedIntent.targetPatterns[0] ?? safeTopic}\nВыбери слово или форму по смыслу.`,
      repeat_translate: `**Переведи на английский:**\n${resolvedIntent.examples
        .slice(0, 3)
        .map((example, index) => `${index + 1}) ${example.ru}`)
        .join('\n')}`,
      write_own_sentence: `**Напиши своё предложение:**\nТема: ${safeTopic}\nИспользуй один шаблон: ${resolvedIntent.targetPatterns[0] ?? safeTopic}.`,
    },
    adaptiveTemplate,
    tutorIntent: resolvedIntent,
  }
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const correlationId = req.headers.get('x-correlation-id')?.trim() || createLessonRouteCorrelationId('blueprint')
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const provider: AiProvider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'
  const topic = (body.topic ?? '').trim()
  if (!topic) {
    return NextResponse.json({ error: 'Тема для урока не передана.' }, { status: 400 })
  }
  const isReviewChip = body.source === 'language_note_review'
  const intent = normalizeTutorLearningIntent(body.intent)
  const reviewChipTitle = String(body.reviewChip?.title ?? topic)
  const reviewChipOriginal = String(body.reviewChip?.original ?? '')
  const reviewChipCorrect = String(body.reviewChip?.correct ?? '')
  const cacheTopic = isReviewChip
    ? buildReviewChipNamespacedCacheTopic(reviewChipTitle, reviewChipOriginal, reviewChipCorrect)
    : topic
  const cacheKey = buildLessonBlueprintCacheKey({
    topic: cacheTopic,
    level: body.level ?? 'a2',
    audience: body.audience ?? 'adult',
    provider,
    openAiChatPreset,
    analysisSummary: body.analysisSummary,
    intentKey: createTutorLearningIntentCacheKey(intent),
  })
  const cacheReadStartedAt = Date.now()
  const cachedResponse = readLessonRouteCache<BlueprintOkPayload>(cacheKey)
  if (cachedResponse) {
    if (isReviewChip && cachedResponse.fallback) {
      logLessonRouteSummary({
        correlationId,
        mode: 'blueprint',
        lessonId: cacheTopic,
        selectedVariantId: null,
        durationMs: Date.now() - startedAt,
        source: 'cache',
        generated: false,
        fallback: true,
      })
      return NextResponse.json(
        { error: REVIEW_CHIP_GENERATE_ERROR },
        { status: 502, headers: { 'x-correlation-id': correlationId } }
      )
    }
    logLessonRouteSummary({
      correlationId,
      mode: 'blueprint',
      lessonId: cacheTopic,
      selectedVariantId: null,
      durationMs: Date.now() - startedAt,
      source: 'cache',
      generated: cachedResponse.generated,
      fallback: cachedResponse.fallback,
    })
    logLessonRouteStages({
      correlationId,
      mode: 'blueprint',
      stages: {
        cache_read_ms: Date.now() - cacheReadStartedAt,
        total_ms: Date.now() - startedAt,
      },
    })
    return NextResponse.json(cachedResponse, {
      headers: { 'x-correlation-id': correlationId },
    })
  }

  const system = isReviewChip
    ? buildReviewChipLessonSystemPrompt()
    : [
        'Ты методист английского для MyEng.',
        'Верни ТОЛЬКО JSON lesson blueprint для короткого урока.',
        'theoryIntro ОБЯЗАТЕЛЬНО строго в таком порядке и с жирными заголовками:',
        '**Урок:**',
        '**Правило:**',
        '**Примеры:**',
        '**Коротко:**',
        '**Шаблоны:**',
        'Формат:',
        '{',
        '  "title":"строка",',
        '  "intro":{"topic":"строка","kind":"single_rule|contrast|concept|tense|structure","complexity":"simple|medium|advanced","quick":{"why":["до 3 пунктов"],"how":["до 3 пунктов"],"examples":[{"en":"English sentence","ru":"перевод","note":"пояснение"}],"takeaway":"одна главная мысль"},"details":{"points":["2-3 пункта"],"examples":[{"en":"English sentence","ru":"перевод","note":"пояснение"}]},"deepDive":{"commonMistakes":["2-3 ошибки"],"contrastNotes":["1-3 нюанса"],"selfCheckRule":"правило самопроверки"},"learningPlan":{"grammarFocus":["строка"],"contrastPair":["A","B"],"firstPracticeGoal":"строка"}}',
        '  "theoryIntro":"строка с \\n",',
        '  "actions":[{"id":"examples","label":"Посмотри примеры"},{"id":"fill_phrase","label":"Подставь слово"},{"id":"repeat_translate","label":"Переведи на английский"},{"id":"write_own_sentence","label":"Напиши своё предложение"}],',
        '  "followups":{"examples":"строка","fill_phrase":"строка","repeat_translate":"строка","write_own_sentence":"строка"},',
        '  "adaptiveTemplate":{"grammarFocus":["строка"],"recommendedStartDifficulty":"easy","preferredExerciseModes":["drill","production","micro_quiz"],"supportsAdaptiveVariants":true}',
        '}',
        'Текст секций на русском, английские примеры допустимы.',
        'Не используй английские грамматические термины, если есть понятный русский вариант: embedded questions -> встроенные вопросы, wh-word -> вопросительное слово, subject -> подлежащее, verb -> глагол, intro phrase -> вводная фраза.',
        'Английские слова оставляй только в самих примерах, фразах-шаблонах и названиях форм без устойчивого русского аналога.',
        'intro.quick должен быть очень коротким: пользователь должен сразу понять зачем тема нужна и как она работает.',
        'Не добавляй инфошум, длинные таблицы, редкие исключения и академические определения в intro.quick.',
        'Если передан tutorIntent, строго строй урок вокруг его goalRu, targetPatterns, examples, mustTrain и mustAvoid.',
        'Не используй служебные фразы как основной материал: "I understand this rule", "We practice short examples", "This sentence is about...".',
        'Не пропускай секции и не меняй порядок заголовков.',
        'adaptiveTemplate можно вернуть дополнительно, если тема явно задает грамматический контраст или будущую адаптивную практику.',
      ].join('\n')

  const reviewChipNote: LanguageNote | null =
    isReviewChip && body.reviewChip
      ? {
          status: 'needs_fix',
          original: reviewChipOriginal,
          correct: reviewChipCorrect,
          correctHighlights: [],
          correctReasons: Array.isArray(body.reviewChip.correctReasons)
            ? body.reviewChip.correctReasons.map(String).slice(0, 2)
            : [],
          better: null,
          betterHighlights: [],
          betterReasons: [],
          betterAlternatives: [],
          reviewTopics: [],
          lessonId: null,
          lessonTitle: null,
        }
      : null
  const reviewChipTopic: LanguageNoteReviewTopic = {
    id: 'review-chip',
    title: reviewChipTitle,
  }

  const user = isReviewChip && reviewChipNote
    ? [
        buildReviewChipLessonUserPayload({ chip: reviewChipTopic, note: reviewChipNote }),
        `Уровень: ${body.level ?? 'a2'}`,
        `Аудитория: ${body.audience ?? 'adult'}`,
      ].join('\n')
    : [
        `Тема: ${topic}`,
        body.originalQuery ? `Исходный запрос ученика: ${body.originalQuery}` : '',
        intent ? `Tutor intent JSON: ${JSON.stringify(intent)}` : '',
        `Уровень: ${body.level ?? 'a2'}`,
        `Аудитория: ${body.audience ?? 'adult'}`,
        body.analysisSummary ? `Контекст с фото: ${body.analysisSummary}` : '',
      ]
        .filter(Boolean)
        .join('\n')

  const makeTutorFallback = (): InflightResult => {
    if (isReviewChip) {
      return { kind: 'review_fail', error: REVIEW_CHIP_GENERATE_ERROR }
    }
    const payload: BlueprintOkPayload = {
      lesson: defaultLesson(topic, intent),
      generated: false,
      fallback: true,
    }
    writeLessonRouteCache(cacheKey, payload)
    return { kind: 'ok', payload }
  }

  const responseResult = await runLessonRouteInflight(cacheKey, async (): Promise<InflightResult> => {
    const providerStartedAt = Date.now()
    const model = await callProviderChat({
      provider,
      req,
      apiMessages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      maxTokens: 1800,
      openAiChatPreset,
      traceLabel: 'lesson-blueprint',
    })

    if (!model.ok) {
      const result = makeTutorFallback()
      logLessonRouteSummary({
        correlationId,
        mode: 'blueprint',
        lessonId: cacheTopic,
        selectedVariantId: null,
        durationMs: Date.now() - startedAt,
        source: 'provider',
        generated: false,
        fallback: true,
      })
      logLessonRouteStages({
        correlationId,
        mode: 'blueprint',
        stages: {
          provider_ms: Date.now() - providerStartedAt,
          total_ms: Date.now() - startedAt,
        },
      })
      return result
    }

    const json = extractJsonObject(model.content)
    if (!json) {
      const result = makeTutorFallback()
      logLessonRouteSummary({
        correlationId,
        mode: 'blueprint',
        lessonId: cacheTopic,
        selectedVariantId: null,
        durationMs: Date.now() - startedAt,
        source: 'provider',
        generated: false,
        fallback: true,
      })
      logLessonRouteStages({
        correlationId,
        mode: 'blueprint',
        stages: {
          provider_ms: Date.now() - providerStartedAt,
          total_ms: Date.now() - startedAt,
        },
      })
      return result
    }

    try {
      const validationStartedAt = Date.now()
      const parsed = JSON.parse(json) as unknown
      let blueprint: LessonBlueprint | null = null
      if (isValidLessonBlueprint(parsed)) {
        blueprint = parsed
      } else if (isReviewChip) {
        blueprint = coerceReviewChipBlueprint(parsed, topic)
      }
      if (!blueprint) {
        const result = makeTutorFallback()
        logLessonRouteSummary({
          correlationId,
          mode: 'blueprint',
          lessonId: cacheTopic,
          selectedVariantId: null,
          durationMs: Date.now() - startedAt,
          source: 'provider',
          generated: false,
          fallback: true,
        })
        logLessonRouteStages({
          correlationId,
          mode: 'blueprint',
          stages: {
            provider_ms: validationStartedAt - providerStartedAt,
            validation_ms: Date.now() - validationStartedAt,
            total_ms: Date.now() - startedAt,
          },
        })
        return result
      }
      const normalizedTheoryIntro = normalizeTheoryIntro(blueprint.theoryIntro)
      if (!hasRequiredTheoryStructure(normalizedTheoryIntro)) {
        const result = makeTutorFallback()
        logLessonRouteSummary({
          correlationId,
          mode: 'blueprint',
          lessonId: cacheTopic,
          selectedVariantId: null,
          durationMs: Date.now() - startedAt,
          source: 'provider',
          generated: false,
          fallback: true,
        })
        logLessonRouteStages({
          correlationId,
          mode: 'blueprint',
          stages: {
            provider_ms: validationStartedAt - providerStartedAt,
            validation_ms: Date.now() - validationStartedAt,
            total_ms: Date.now() - startedAt,
          },
        })
        return result
      }
      const payload: BlueprintOkPayload = {
        lesson: { ...blueprint, theoryIntro: normalizedTheoryIntro, ...(intent ? { tutorIntent: intent } : {}) },
        generated: true,
        fallback: false,
      }
      writeLessonRouteCache(cacheKey, payload)
      logLessonRouteSummary({
        correlationId,
        mode: 'blueprint',
        lessonId: cacheTopic,
        selectedVariantId: null,
        durationMs: Date.now() - startedAt,
        source: 'provider',
        generated: true,
        fallback: false,
      })
      logLessonRouteStages({
        correlationId,
        mode: 'blueprint',
        stages: {
          provider_ms: validationStartedAt - providerStartedAt,
          validation_ms: Date.now() - validationStartedAt,
          total_ms: Date.now() - startedAt,
        },
      })
      return { kind: 'ok', payload }
    } catch {
      const result = makeTutorFallback()
      logLessonRouteSummary({
        correlationId,
        mode: 'blueprint',
        lessonId: cacheTopic,
        selectedVariantId: null,
        durationMs: Date.now() - startedAt,
        source: 'provider',
        generated: false,
        fallback: true,
      })
      logLessonRouteStages({
        correlationId,
        mode: 'blueprint',
        stages: {
          provider_ms: Date.now() - providerStartedAt,
          total_ms: Date.now() - startedAt,
        },
      })
      return result
    }
  })

  if (responseResult.kind === 'review_fail') {
    return NextResponse.json(
      { error: responseResult.error },
      { status: 502, headers: { 'x-correlation-id': correlationId } }
    )
  }

  return NextResponse.json(responseResult.payload, {
    headers: { 'x-correlation-id': correlationId },
  })
}
