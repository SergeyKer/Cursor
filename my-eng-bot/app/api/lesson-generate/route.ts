import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import type { AiProvider } from '@/lib/types'
import { hasRequiredTheoryStructure, isValidLessonBlueprint, type TutorAdaptiveTemplate } from '@/lib/lessonBlueprint'
import { buildFallbackLessonIntro } from '@/lib/lessonIntro'
import {
  buildLessonBlueprintCacheKey,
  createLessonRouteCorrelationId,
  logLessonRouteStages,
  logLessonRouteSummary,
  readLessonRouteCache,
  runLessonRouteInflight,
  writeLessonRouteCache,
} from '@/lib/lessonRouteRuntime'

type Body = {
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  topic?: string
  level?: string
  audience?: string
  analysisSummary?: string
}

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

function defaultLesson(topic: string) {
  const safeTopic = topic.trim() || 'выбранной теме'
  const normalizedTopic = safeTopic.toLowerCase()
  const contrastPair =
    normalizedTopic.includes('present perfect') && normalizedTopic.includes('past simple')
      ? (['Present Perfect', 'Past Simple'] as [string, string])
      : undefined
  const adaptiveTemplate: TutorAdaptiveTemplate = {
    grammarFocus: contrastPair ? [...contrastPair] : [safeTopic],
    ...(contrastPair ? { contrastPair } : {}),
    recommendedStartDifficulty: 'easy',
    preferredExerciseModes: contrastPair ? ['contrast', 'drill', 'production', 'micro_quiz'] : ['drill', 'production', 'micro_quiz'],
    supportsAdaptiveVariants: true,
  }
  return {
    title: `Тема: ${safeTopic}`,
    intro: buildFallbackLessonIntro(safeTopic),
    theoryIntro:
      `**Урок:** ${safeTopic}\n` +
      '**Правило:**\n' +
      '1) Берем ключевую тему и применяем в коротких фразах.\n' +
      '2) Используем тему в понятном контексте.\n' +
      '**Примеры:**\n' +
      `1) We practice ${safeTopic} in simple phrases.\n` +
      `2) This sentence is about ${safeTopic}.\n` +
      '**Коротко:** это правило нужно, чтобы уверенно использовать тему в речи.\n' +
      '**Шаблоны:**\n' +
      `1) I use ${safeTopic} in context.\n` +
      `2) This is about ${safeTopic}.`,
    actions: [
      { id: 'examples', label: 'Посмотри примеры' },
      { id: 'fill_phrase', label: 'Подставь слово' },
      { id: 'repeat_translate', label: 'Переведи на английский' },
      { id: 'write_own_sentence', label: 'Напиши своё предложение' },
    ],
    followups: {
      examples: `**Примеры по теме "${safeTopic}":**\n1) First short example.\n2) Second short example.\n3) Third short example.`,
      fill_phrase: '**Подставь слово:**\n1) I ____ this topic.\n2) This is ____ example.\nВыбери подходящее слово.',
      repeat_translate: '**Переведи на английский:**\n1) Это моя тема.\n2) Я хочу изучать это.\n3) Дай короткий пример.',
      write_own_sentence: `**Напиши своё предложение:**\nТема: ${safeTopic}\nНапиши 3 коротких примера.`,
    },
    adaptiveTemplate,
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
  const cacheKey = buildLessonBlueprintCacheKey({
    topic,
    level: body.level ?? 'a2',
    audience: body.audience ?? 'adult',
    provider,
    openAiChatPreset,
    analysisSummary: body.analysisSummary,
  })
  const cacheReadStartedAt = Date.now()
  const cachedResponse = readLessonRouteCache<{ lesson: ReturnType<typeof defaultLesson>; generated: boolean; fallback: boolean }>(cacheKey)
  if (cachedResponse) {
    logLessonRouteSummary({
      correlationId,
      mode: 'blueprint',
      lessonId: topic,
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

  const system = [
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
    'Не пропускай секции и не меняй порядок заголовков.',
    'adaptiveTemplate можно вернуть дополнительно, если тема явно задает грамматический контраст или будущую адаптивную практику.',
  ].join('\n')

  const user = [
    `Тема: ${topic}`,
    `Уровень: ${body.level ?? 'a2'}`,
    `Аудитория: ${body.audience ?? 'adult'}`,
    body.analysisSummary ? `Контекст с фото: ${body.analysisSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const responsePayload = await runLessonRouteInflight(cacheKey, async () => {
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
      const payload = { lesson: defaultLesson(topic), generated: false, fallback: true }
      writeLessonRouteCache(cacheKey, payload)
      logLessonRouteSummary({
        correlationId,
        mode: 'blueprint',
        lessonId: topic,
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
      return payload
    }

    const json = extractJsonObject(model.content)
    if (!json) {
      const payload = { lesson: defaultLesson(topic), generated: false, fallback: true }
      writeLessonRouteCache(cacheKey, payload)
      logLessonRouteSummary({
        correlationId,
        mode: 'blueprint',
        lessonId: topic,
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
      return payload
    }

    try {
      const validationStartedAt = Date.now()
      const parsed = JSON.parse(json) as unknown
      if (!isValidLessonBlueprint(parsed)) {
        const payload = { lesson: defaultLesson(topic), generated: false, fallback: true }
        writeLessonRouteCache(cacheKey, payload)
        logLessonRouteSummary({
          correlationId,
          mode: 'blueprint',
          lessonId: topic,
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
        return payload
      }
      const normalizedTheoryIntro = normalizeTheoryIntro(parsed.theoryIntro)
      if (!hasRequiredTheoryStructure(normalizedTheoryIntro)) {
        const payload = { lesson: defaultLesson(topic), generated: false, fallback: true }
        writeLessonRouteCache(cacheKey, payload)
        logLessonRouteSummary({
          correlationId,
          mode: 'blueprint',
          lessonId: topic,
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
        return payload
      }
      const payload = {
        lesson: { ...parsed, theoryIntro: normalizedTheoryIntro },
        generated: true,
        fallback: false,
      }
      writeLessonRouteCache(cacheKey, payload)
      logLessonRouteSummary({
        correlationId,
        mode: 'blueprint',
        lessonId: topic,
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
      return payload
    } catch {
      const payload = { lesson: defaultLesson(topic), generated: false, fallback: true }
      writeLessonRouteCache(cacheKey, payload)
      logLessonRouteSummary({
        correlationId,
        mode: 'blueprint',
        lessonId: topic,
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
      return payload
    }
  })

  return NextResponse.json(responsePayload, {
    headers: { 'x-correlation-id': correlationId },
  })
}
