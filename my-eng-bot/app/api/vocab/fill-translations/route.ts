import { NextRequest, NextResponse } from 'next/server'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'
import { callProviderChat } from '@/lib/callProviderChat'
import type { AiProvider, Audience, OpenAiChatPreset } from '@/lib/types'

export const runtime = 'nodejs'

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 20
const rateBuckets = new Map<string, { count: number; resetAt: number }>()
const MAX_ITEMS = 40

type Body = {
  provider?: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  items?: string[]
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
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
    return NextResponse.json({ error: 'bad_json', userMessage: 'Неверный JSON.' }, { status: 400 })
  }

  const items = (Array.isArray(body.items) ? body.items : [])
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, MAX_ITEMS)
  if (items.length === 0) {
    return NextResponse.json({ error: 'empty', userMessage: 'Нет слов для перевода.' }, { status: 400 })
  }

  const provider: AiProvider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset: OpenAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'

  const model = await callProviderChat({
    provider,
    req,
    openAiChatPreset,
    maxTokens: 800,
    apiMessages: [
      {
        role: 'system',
        content:
          'Translate English vocabulary items to Russian. Return ONLY JSON: { "items": [{ "en": "word", "ru": "перевод" }] }. Keep short phrases. No extra keys.',
      },
      { role: 'user', content: JSON.stringify({ items }) },
    ],
  })
  if (!model.ok) {
    return NextResponse.json({ error: model.errText, userMessage: 'Не удалось подставить перевод.' }, { status: model.status })
  }
  const jsonText = extractJsonObject(model.content)
  if (!jsonText) {
    return NextResponse.json({ error: 'bad_model', userMessage: 'Не удалось подставить перевод.' }, { status: 502 })
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return NextResponse.json({ error: 'bad_model', userMessage: 'Не удалось подставить перевод.' }, { status: 502 })
  }
  const raw = parsed && typeof parsed === 'object' ? (parsed as { items?: unknown }).items : null
  const filled = Array.isArray(raw)
    ? raw.flatMap((row) => {
        if (!row || typeof row !== 'object') return []
        const rec = row as Record<string, unknown>
        const en = typeof rec.en === 'string' ? rec.en.trim() : ''
        const ru = typeof rec.ru === 'string' ? rec.ru.trim() : ''
        return en && ru ? [{ en, ru }] : []
      })
    : []
  return NextResponse.json({ items: filled })
}
