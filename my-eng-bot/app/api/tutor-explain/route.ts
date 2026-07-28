import { NextRequest, NextResponse } from 'next/server'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'
import { callProviderChat } from '@/lib/callProviderChat'
import { normalizeTutorExplain } from '@/lib/tutor/normalizeExplain'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import type { AiProvider, Audience, LevelId } from '@/lib/types'

export const runtime = 'nodejs'

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 30
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

type Body = {
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  query?: string
  level?: LevelId
  audience?: Audience
  anchorTitle?: string
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function buildSystemPrompt(audience: Audience, level: LevelId): string {
  const childRules =
    audience === 'child'
      ? [
          'Аудитория: ребёнок/подросток. Пиши просто, по-русски, на «ты».',
          'Безопасность: только школьный английский; без взрослых/опасных тем.',
          'paragraphs: ровно 2..5 коротких абзацев. examplesEn: 1..2 английских примера.',
        ]
      : [
          'Аудитория: взрослый. Можно чуть компактнее.',
          'paragraphs: 1..5 абзацев. examplesEn: 0..3 английских примера.',
        ]

  return [
    'Ты — репетитор английского. Дай ясный ответ на вопрос ученика.',
    'Это НЕ урок и НЕ эссе: без Hook/Rule/Formula карточек, без длинного плана занятия.',
    'Верни ТОЛЬКО JSON без markdown.',
    'Формат:',
    '{',
    '  "answerKind": "grammar|contrast|form|translate|how_to_say|orthography|other",',
    '  "title": "короткий заголовок",',
    '  "paragraphs": ["абзац на русском", "..."],',
    '  "examplesEn": ["English example"],',
    '  "rememberRu": "опционально одна фраза-запоминалка",',
    '  "contrastPair": ["A","B"],',
    '  "topicAnchor": { "title":"...", "canonicalKey":"snake_case", "lessonIdHint": null, "skillTagIds": [] }',
    '}',
    'answerKind:',
    '- grammar / contrast / form — правило или сравнение форм;',
    '- translate — чистый перевод;',
    '- how_to_say — как сказать фразу;',
    '- orthography — регистр/написание;',
    '- other — остальное.',
    `Уровень CEFR-якорь: ${level}.`,
    ...childRules,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const ip = clientIpFromRequest(req.headers)
  if (!checkIpRateLimit({ buckets: rateBuckets, ip, windowMs: RATE_WINDOW_MS, max: RATE_MAX })) {
    return NextResponse.json(
      { error: 'rate_limit', userMessage: 'Слишком много запросов. Подождите.' },
      { status: 429 }
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'bad_json', userMessage: 'Неверный JSON.' }, { status: 400 })
  }

  const query = typeof body.query === 'string' ? body.query.replace(/\s+/g, ' ').trim() : ''
  if (!query) {
    return NextResponse.json(
      { error: 'empty_query', userMessage: 'Пустой вопрос.' },
      { status: 400 }
    )
  }

  const audience: Audience = body.audience === 'child' ? 'child' : 'adult'
  const level: LevelId = body.level ?? 'a2'
  const provider: AiProvider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'
  const anchorTitle =
    typeof body.anchorTitle === 'string' ? body.anchorTitle.replace(/\s+/g, ' ').trim() : ''

  const system = buildSystemPrompt(audience, level)
  const user = [
    `Вопрос ученика: ${query}`,
    anchorTitle ? `Якорь темы: ${anchorTitle}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const model = await callProviderChat({
      provider,
      req,
      apiMessages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      maxTokens: 900,
      openAiChatPreset,
      traceLabel: 'tutor-explain',
    })

    if (!model.ok) {
      return NextResponse.json(
        { error: 'provider_failed', userMessage: 'Не удалось объяснить. Попробуй ещё раз.' },
        { status: 502 }
      )
    }

    let parsed: unknown = null
    try {
      parsed = JSON.parse(extractJsonObject(model.content) || model.content)
    } catch {
      parsed = null
    }

    const answer: TutorExplainAnswer | null = normalizeTutorExplain(parsed, { audience })
    if (!answer) {
      return NextResponse.json(
        { error: 'normalize_failed', userMessage: 'Не удалось разобрать ответ. Попробуй ещё раз.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ answer })
  } catch {
    return NextResponse.json(
      { error: 'provider_failed', userMessage: 'Не удалось объяснить. Попробуй ещё раз.' },
      { status: 502 }
    )
  }
}
