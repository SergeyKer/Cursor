import { NextRequest, NextResponse } from 'next/server'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'
import { buildProviderUserMessage } from '@/lib/buildProviderUserMessage'
import { callProviderChat } from '@/lib/callProviderChat'
import { isTutorMicroPackEligible } from '@/lib/tutor/microEligible'
import { buildTutorMicroSystemPrompt, buildTutorMicroUserPrompt } from '@/lib/tutor/microPrompt'
import { normalizeTutorMicroPack } from '@/lib/tutor/normalizeMicro'
import { asRecord, compactText } from '@/lib/tutor/text'
import type { TutorExplainAnswer, TutorMicroPack } from '@/lib/tutor/types'
import type { AiProvider, Audience, LevelId } from '@/lib/types'

export const runtime = 'nodejs'

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 20
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

type Body = {
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  query?: string
  level?: LevelId
  audience?: Audience
  answer?: TutorExplainAnswer
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function isExplainAnswerShape(value: unknown): value is TutorExplainAnswer {
  const row = asRecord(value)
  if (!row) return false
  if (typeof row.answerKind !== 'string' || typeof row.title !== 'string') return false
  if (!Array.isArray(row.paragraphs) || !Array.isArray(row.examplesEn)) return false
  const anchor = asRecord(row.topicAnchor)
  if (!anchor || typeof anchor.title !== 'string' || typeof anchor.canonicalKey !== 'string') {
    return false
  }
  return true
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

  const query = compactText(body.query, 400)
  if (!query || !isExplainAnswerShape(body.answer)) {
    return NextResponse.json(
      { error: 'bad_request', userMessage: 'Нужны вопрос и разбор темы.' },
      { status: 400 }
    )
  }

  const answer = body.answer
  const audience: Audience = body.audience === 'child' ? 'child' : 'adult'
  const level: LevelId = body.level ?? 'a2'
  const provider: AiProvider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'

  try {
    const model = await callProviderChat({
      provider,
      req,
      apiMessages: [
        { role: 'system', content: buildTutorMicroSystemPrompt(audience, level) },
        { role: 'user', content: buildTutorMicroUserPrompt({ userQuestion: query, answer }) },
      ],
      maxTokens: 1000,
      openAiChatPreset,
      traceLabel: 'tutor-micro',
    })

    if (!model.ok) {
      const { userMessage } = buildProviderUserMessage({
        provider,
        status: model.status,
        errText: model.errText,
        defaultMessage: 'Не удалось собрать проверку. Попробуй ещё раз.',
      })
      return NextResponse.json({ error: 'provider_failed', userMessage }, { status: 502 })
    }

    let parsed: unknown = null
    try {
      parsed = JSON.parse(extractJsonObject(model.content) || model.content)
    } catch {
      parsed = null
    }

    const row = asRecord(parsed)
    if (!row) {
      return NextResponse.json(
        { error: 'normalize_failed', userMessage: 'Не удалось разобрать проверку.' },
        { status: 502 }
      )
    }

    if (row.micro === null) {
      const reason = compactText(row.reason, 40) || 'other'
      return NextResponse.json({ micro: null, reason })
    }

    const pack: TutorMicroPack | null = normalizeTutorMicroPack(row.micro ?? row)
    if (!pack || !isTutorMicroPackEligible(pack, answer)) {
      return NextResponse.json({ micro: null, reason: 'rejected' })
    }

    return NextResponse.json({ micro: pack })
  } catch {
    return NextResponse.json(
      { error: 'provider_failed', userMessage: 'Не удалось собрать проверку. Попробуй ещё раз.' },
      { status: 502 }
    )
  }
}
