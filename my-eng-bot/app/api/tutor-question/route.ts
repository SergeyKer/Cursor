import { NextRequest, NextResponse } from 'next/server'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'
import { callProviderChat } from '@/lib/callProviderChat'
import { compactText } from '@/lib/tutor/text'
import type { AiProvider, Audience, LevelId } from '@/lib/types'

export const runtime = 'nodejs'

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 20
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

type Body = {
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  audience?: Audience
  level?: LevelId
  zone?: {
    skillTagId?: string
    title?: string
    sourceHint?: string
    errorCount?: number
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
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const title = compactText(body.zone?.title, 120)
  const skillTagId = compactText(body.zone?.skillTagId, 80)
  if (!title || !skillTagId) {
    return NextResponse.json({ error: 'bad_zone' }, { status: 400 })
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

  const system = [
    'Сформулируй один короткий педагогический вопрос ученику про английскую тему.',
    'Вопрос без ответа, без счётчика ошибок, без нравоучений.',
    'Верни ТОЛЬКО JSON: {"question":"..."} на русском.',
    audience === 'child' ? 'Тон: простой, на «ты».' : 'Тон: спокойный взрослый.',
    `Уровень: ${level}.`,
  ].join('\n')

  const user = [
    `Тема: ${title}`,
    body.zone?.sourceHint ? `Контекст: ${compactText(body.zone.sourceHint, 160)}` : '',
    'Пример стиля: «Зачем Present Perfect, если есть Past Simple?»',
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
    maxTokens: 120,
    openAiChatPreset,
    traceLabel: 'tutor-question',
  })

  if (!model.ok) {
    return NextResponse.json({ error: 'provider_failed' }, { status: 502 })
  }

  let question = ''
  try {
    const parsed = JSON.parse(extractJsonObject(model.content) || model.content) as {
      question?: unknown
    }
    question = compactText(parsed.question, 280)
  } catch {
    question = ''
  }

  if (!question) {
    return NextResponse.json({ error: 'normalize_failed' }, { status: 502 })
  }

  return NextResponse.json({ question, skillTagId })
}
