import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { findStaticLessonByTopic } from '@/lib/learningLessons'
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
  return {
    resolved: true,
    status: 'resolved',
    confidence: hasGrammarSignal(q) ? 'medium' : 'low',
    suggestions: [q],
    suggestionMeta: [{ topic: q, whyRu: 'Тема выбрана по вашему запросу.' }],
    primaryTopic: q,
  }
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

  // 0) Предустановленные грамматические маршруты для ожидаемых кейсов.
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
      {
        resolved: true,
        status: 'resolved',
        confidence: 'high',
        suggestions: [staticLesson.title],
        suggestionMeta: [{ topic: staticLesson.title, whyRu: 'Найдена готовая тема в базе уроков.' }],
        primaryTopic: staticLesson.title,
      } satisfies TopicResolutionResponse,
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
    '  "primaryTopic": "Topic 1",',
    '  "clarifyPrompt": "строка на русском, если тему нельзя определить"',
    '}',
    'Правила:',
    '- suggestions: 1..5 коротких грамматических тем на английском.',
    '- Для каждого варианта заполни suggestionMeta с тем же topic и понятным whyRu на русском.',
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

    return NextResponse.json(
      {
        resolved: true,
        status: 'resolved',
        confidence: hasGrammarSignal(query) ? 'high' : 'medium',
        suggestions,
        suggestionMeta,
        primaryTopic,
      } satisfies TopicResolutionResponse,
      { status: 200 }
    )
  } catch {
    return NextResponse.json(safeFallback(query), { status: 200 })
  }
}
