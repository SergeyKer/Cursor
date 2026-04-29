import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { findStaticLessonByTopic } from '@/lib/learningLessons'
import {
  buildFallbackTutorLearningIntent,
  buildPresetTutorLearningIntents,
  buildShortExamplesTutorIntent,
  normalizeTutorLearningIntentOptions,
  type TutorLearningIntent,
} from '@/lib/tutorLearningIntent'
import type { AiProvider, Audience, LevelId } from '@/lib/types'

type Body = {
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  query?: string
  level?: LevelId
  audience?: Audience
  analysisSummary?: string
}

type TopicResolutionResponse = {
  resolved: boolean
  status?: 'resolved' | 'needs_clarification' | 'rejected'
  confidence?: 'low' | 'medium' | 'high'
  suggestions: string[]
  suggestionMeta?: Array<{ topic: string; whyRu: string }>
  intentOptions?: TutorLearningIntent[]
  primaryTopic?: string
  clarifyPrompt?: string
}

function normalizeTopic(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function dedupeTopics(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    if (typeof item !== 'string') continue
    const topic = normalizeTopic(item)
    if (!topic || seen.has(topic.toLowerCase())) continue
    seen.add(topic.toLowerCase())
    result.push(topic)
    if (result.length >= 5) break
  }
  return result
}

function normalizeSuggestionMeta(items: unknown): Array<{ topic: string; whyRu: string }> {
  if (!Array.isArray(items)) return []
  const seen = new Set<string>()
  const result: Array<{ topic: string; whyRu: string }> = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const topic = typeof row.topic === 'string' ? normalizeTopic(row.topic) : ''
    const whyRu = typeof row.whyRu === 'string' ? normalizeTopic(row.whyRu) : ''
    if (!topic || !whyRu || seen.has(topic.toLowerCase())) continue
    seen.add(topic.toLowerCase())
    result.push({ topic, whyRu })
    if (result.length >= 5) break
  }
  return result
}

function hasGrammarSignal(input: string): boolean {
  const q = input.toLowerCase()
  const words = q.match(/[a-zа-яё]+/gi) ?? []
  if (
    words.some((word) =>
      [
        'am',
        'is',
        'are',
        'was',
        'were',
        'be',
        'been',
        'being',
        'do',
        'does',
        'did',
        'has',
        'have',
        'had',
        'who',
        'where',
        'what',
        'when',
      ].includes(word)
    )
  ) {
    return true
  }

  return [
    'present',
    'past',
    'future',
    'perfect',
    'continuous',
    'simple',
    'tense',
    'much',
    'many',
    'few',
    'little',
    'some',
    'any',
    'to be',
    'have',
    'has',
    'have been',
    'has been',
    'do',
    'does',
    'did',
    'article',
    'articles',
    'plural',
    'singular',
    'preposition',
    'question',
    'who',
    'where',
    'what',
    'when',
    'grammar',
    'граммат',
    'время',
    'времена',
    'артик',
    'предлог',
    'множествен',
    'единствен',
    'вопрос',
    'глагол',
    'местоим',
    'разниц',
    'отлич',
    'правило',
  ].some((marker) => q.includes(marker))
}

function isLikelyNoise(input: string): boolean {
  const q = normalizeTopic(input).toLowerCase()
  if (q.length < 3) return true
  if (!/[a-zа-яё]/i.test(q)) return true
  if (/^[a-zа-яё]{3,}$/i.test(q) && !/[aeiouаеёиоуыэюя]/i.test(q)) return true
  if (/^(.)\1{2,}$/u.test(q)) return true
  return false
}

function buildNoiseRejection(): TopicResolutionResponse {
  return {
    resolved: false,
    status: 'rejected',
    confidence: 'low',
    suggestions: [],
    clarifyPrompt: 'Не похоже на осмысленный запрос. Напишите, например: Present Simple, much/many, артикли, множественное число.',
  }
}

function buildResponseFromIntents(intents: TutorLearningIntent[], confidence: 'low' | 'medium' | 'high' = 'medium'): TopicResolutionResponse {
  return {
    resolved: true,
    status: 'resolved',
    confidence,
    suggestions: intents.map((intent) => intent.title),
    suggestionMeta: intents.map((intent) => ({ topic: intent.title, whyRu: intent.goalRu })),
    intentOptions: intents,
    primaryTopic: intents[0]?.title,
  }
}

function safeFallback(query: string): TopicResolutionResponse {
  const q = normalizeTopic(query)
  if (!q) {
    return {
      resolved: false,
      status: 'needs_clarification',
      confidence: 'low',
      suggestions: [],
      clarifyPrompt:
        'ИИ: не удалось точно определить грамматическую тему. Уточните запрос (например: Present Simple, Have/Has, Articles a/an/the).',
    }
  }
  return buildResponseFromIntents([buildShortExamplesTutorIntent(q)], hasGrammarSignal(q) ? 'medium' : 'low')
}

function resolvePresetGrammarTopic(query: string): TopicResolutionResponse | null {
  const q = query.toLowerCase()
  if (!q) return null

  // Возвращаем предсказуемые базовые соответствия для частых грамматических запросов.
  if (/\b(?:am|is|are|was|were|be|been|being)\b|\bto\s+be\b/.test(q)) {
    return {
      resolved: true,
      status: 'resolved',
      confidence: 'high',
      suggestions: ['To Be'],
      suggestionMeta: [{ topic: 'To Be', whyRu: 'Формы глагола-связки be: am, is, are, was, were.' }],
      intentOptions: [buildFallbackTutorLearningIntent('To Be')],
      primaryTopic: 'To Be',
    }
  }

  if (/\bmany\b|\bmuch\b|many\/much/.test(q)) {
    return {
      resolved: true,
      status: 'resolved',
      confidence: 'high',
      suggestions: ['Many/Much'],
      suggestionMeta: [{ topic: 'Many/Much', whyRu: 'Выбор между many и much для количества.' }],
      intentOptions: [buildFallbackTutorLearningIntent('Many/Much')],
      primaryTopic: 'Many/Much',
    }
  }

  if (/\bhave\s+been\b/.test(q)) {
    return {
      resolved: true,
      status: 'resolved',
      confidence: 'high',
      suggestions: ['Present Perfect', 'Present Perfect Continuous', 'To Be'],
      suggestionMeta: [
        { topic: 'Present Perfect', whyRu: 'Конструкция have/has + V3: связь прошлого с настоящим.' },
        { topic: 'Present Perfect Continuous', whyRu: 'Длительное действие: have/has been + V-ing.' },
        { topic: 'To Be', whyRu: 'Базовый глагол-связка и его формы в разных временах.' },
      ],
      primaryTopic: 'Present Perfect',
      intentOptions: [
        buildFallbackTutorLearningIntent('Present Perfect'),
        buildFallbackTutorLearningIntent('Present Perfect Continuous'),
        buildFallbackTutorLearningIntent('To Be'),
      ],
    }
  }

  return null
}

export async function POST(req: NextRequest) {
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
  const level: LevelId = body.level ?? 'a2'
  const audience: Audience = body.audience ?? 'adult'
  const query = normalizeTopic(body.query ?? '')
  const analysisSummary = normalizeTopic(body.analysisSummary ?? '')

  if (!query) {
    return NextResponse.json(
      {
        resolved: false,
        status: 'needs_clarification',
        confidence: 'low',
        suggestions: [],
        clarifyPrompt:
          'ИИ: не удалось точно определить грамматическую тему. Уточните запрос (например: Present Simple, Have/Has, Articles a/an/the).',
      } satisfies TopicResolutionResponse,
      { status: 200 }
    )
  }

  // 0) Предустановленные списки выбора для ожидаемых кейсов.
  const presetIntents = buildPresetTutorLearningIntents(query)
  if (presetIntents.length > 0) {
    return NextResponse.json(buildResponseFromIntents(presetIntents, 'high'), { status: 200 })
  }

  // 0.1) Базовые грамматические маршруты показываем как один поддержанный смысл.
  const preset = resolvePresetGrammarTopic(query)
  if (preset) {
    return NextResponse.json(preset, { status: 200 })
  }

  if (isLikelyNoise(query)) {
    return NextResponse.json(buildNoiseRejection(), { status: 200 })
  }

  // 1) Сначала ищем готовый урок.
  const staticLesson = findStaticLessonByTopic(query)
  if (staticLesson) {
    return NextResponse.json(
      buildResponseFromIntents([buildShortExamplesTutorIntent(staticLesson.title)], 'high'),
      { status: 200 }
    )
  }

  // 2) Если нет — просим модель определить грамматическую тему(ы).
  const system = [
    'Ты эксперт-преподаватель английской грамматики и лингвист.',
    'Определи, какую ИМЕННО грамматическую тему хотел изучать пользователь.',
    'Верни ТОЛЬКО JSON без markdown и комментариев.',
    'Формат JSON:',
    '{',
    '  "resolved": true|false,',
    '  "suggestions": ["Topic 1", "Topic 2"],',
    '  "suggestionMeta": [{"topic":"Topic 1","whyRu":"краткое объяснение по-русски"}],',
    '  "intentOptions": [{"id":"short-id","canonicalKey":"stable_lesson_key","title":"Topic 1","intentType":"single_rule|contrast|phrase_pattern|form_practice|mistake_clinic|short_examples","learnerQuestionRu":"что ученик хочет понять","topicType":"grammar|vocabulary|contrast|phrase_patterns|concept","coreQuestion":"главный вопрос ученика","contrastPair":["A","B"],"meaningFocus":"главный смысловой фокус","goalRu":"что ученик научится делать","targetPatterns":["короткий шаблон"],"examples":[{"en":"English example","ru":"перевод","noteRu":"почему это важно"}],"commonMistakes":["ошибка"],"mustTrain":["что обязательно тренировать"],"mustAvoid":["чего избегать"],"firstPracticeGoalRu":"первый шаг практики"}],',
    '  "primaryTopic": "Topic 1",',
    '  "clarifyPrompt": "строка на русском, если тему нельзя определить"',
    '}',
    'Правила:',
    '- suggestions: 1..5 коротких грамматических тем на английском.',
    '- Для каждого варианта заполни suggestionMeta с тем же topic и понятным whyRu на русском.',
    '- intentOptions: 1..5 вариантов, строго соответствуют suggestions по title; каждый вариант описывает, что именно тренировать в уроке.',
    '- В intentOptions.examples давай живые короткие английские фразы, а не служебные фразы про "topic/rule/pattern".',
    '- Для широких или неоднозначных слов верни 2-5 реальных смыслов. Для понятного запроса верни 1 вариант.',
    '- Не предлагай Questions/Negatives/Common Mistakes как отдельные варианты, если пользователь явно не просил вопрос, отрицание или ошибку.',
    '- intentType выбирай по учебной задаче: contrast для "A или B", form_practice для отдельной формы worked/has done/will be, single_rule для одного правила, short_examples для безопасного fallback.',
    '- Если ввод похож на случайный шум или бессмысленный набор символов, поставь resolved=false и заполнить clarifyPrompt по-русски.',
    '- Если ввод осмысленный, но широкий или не явно грамматический, НЕ отклоняй его: предложи ближайшие темы грамматики английского.',
    '- Не предлагай темы про поведение животных/предметов, только грамматику английского вокруг запроса.',
    '- Если пользователь ввел одно лексическое слово без грамматической задачи (например "cat" или "сыр"), предложи связанные грамматические темы: articles, plural/singular, countable/uncountable nouns и т.п.',
  ].join('\n')

  const user = [
    `Запрос пользователя: ${query}`,
    `Уровень: ${level}`,
    `Аудитория: ${audience}`,
    analysisSummary ? `Контекст анализа фото: ${analysisSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const model = await callProviderChat({
    provider,
    req,
    apiMessages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens: 500,
    openAiChatPreset,
  })

  if (!model.ok) {
    return NextResponse.json(safeFallback(query), { status: 200 })
  }

  const json = extractJsonObject(model.content)
  if (!json) return NextResponse.json(safeFallback(query), { status: 200 })

  try {
    const parsed = JSON.parse(json) as Record<string, unknown>
    const resolved = Boolean(parsed.resolved)
    const suggestions = dedupeTopics(parsed.suggestions)
    const suggestionMetaRaw = normalizeSuggestionMeta(parsed.suggestionMeta)
    const suggestionMeta = suggestions.map((topic) => {
      const existing = suggestionMetaRaw.find((meta) => meta.topic.toLowerCase() === topic.toLowerCase())
      return existing ?? { topic, whyRu: 'Подходит как грамматический фокус для вашего запроса.' }
    })
    const normalizedIntents = normalizeTutorLearningIntentOptions(parsed.intentOptions)
    const intentByTitle = new Map(normalizedIntents.map((intent) => [intent.title.toLowerCase(), intent]))
    const intentOptions = suggestions.map((topic) => intentByTitle.get(topic.toLowerCase()) ?? buildFallbackTutorLearningIntent(topic))
    const primaryTopicRaw = typeof parsed.primaryTopic === 'string' ? normalizeTopic(parsed.primaryTopic) : ''
    const primaryTopic = primaryTopicRaw || suggestions[0]
    const clarifyPromptRaw = typeof parsed.clarifyPrompt === 'string' ? normalizeTopic(parsed.clarifyPrompt) : ''

    if (!resolved || suggestions.length === 0 || !primaryTopic) {
      return NextResponse.json(
        {
          resolved: false,
          status: 'needs_clarification',
          confidence: 'low',
          suggestions: [],
          clarifyPrompt:
            clarifyPromptRaw ||
            'ИИ: не удалось точно определить грамматическую тему. Уточните запрос (например: Present Simple, Have/Has, Articles a/an/the).',
        } satisfies TopicResolutionResponse,
        { status: 200 }
      )
    }

    const response = {
      resolved: true,
      status: 'resolved',
      confidence: hasGrammarSignal(query) ? 'high' : 'medium',
      suggestions,
      suggestionMeta,
      intentOptions,
      primaryTopic,
    } satisfies TopicResolutionResponse

    return NextResponse.json(response, { status: 200 })
  } catch {
    return NextResponse.json(safeFallback(query), { status: 200 })
  }
}
