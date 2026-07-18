import { NextRequest, NextResponse } from 'next/server'
import { buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'
import { resolveEngvoRealtimeInstructionParams } from '@/lib/engvo/resolveRealtimeInstructionParams'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'

export const runtime = 'nodejs'

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 60
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

export async function POST(req: NextRequest) {
  const ip = clientIpFromRequest(req.headers)
  if (!checkIpRateLimit({ buckets: rateBuckets, ip, windowMs: RATE_WINDOW_MS, max: RATE_MAX })) {
    return NextResponse.json(
      { error: 'rate_limit', userMessage: 'Слишком много запросов. Подождите.' },
      { status: 429 }
    )
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const params = resolveEngvoRealtimeInstructionParams(
    {
      audience: typeof body.audience === 'string' ? body.audience : undefined,
      level: typeof body.level === 'string' ? body.level : undefined,
      topic: typeof body.topic === 'string' ? body.topic : undefined,
      speed: body.speed,
      kind: typeof body.kind === 'string' ? body.kind : undefined,
      tense: typeof body.tense === 'string' ? body.tense : undefined,
      sentenceType: typeof body.sentenceType === 'string' ? body.sentenceType : undefined,
      skipTopicChoice: body.skipTopicChoice === true,
      topicPreset: typeof body.topicPreset === 'string' ? body.topicPreset : null,
    },
    body.provider === 'xai' ? 'xai' : 'openai'
  )

  const instructions = buildEngvoRealtimeInstructions(params)
  return NextResponse.json({ instructions, ...params })
}
