import { NextRequest, NextResponse } from 'next/server'
import {
  clampEngvoRealtimeSpeed,
  ENGVO_XAI_DEFAULT_VOICE,
  ENGVO_XAI_MODEL,
  isEngvoCefrLevel,
  isEngvoAllowedXaiVoice,
  ENGVO_DEFAULT_LEVEL,
} from '@/lib/engvo/constants'
import { isEngvoCustomVoiceIdFormat } from '@/lib/engvo/voiceLab/customVoicesManifest'
import {
  ENGVO_XAI_MISSING_KEY_USER_MESSAGE,
  ENGVO_XAI_TOKEN_USER_MESSAGE,
  resolveEngvoRealtimeUserMessage,
} from '@/lib/engvo/errors'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import type { Audience, TopicId } from '@/lib/types'
import { TOPICS } from '@/lib/constants'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'

export const runtime = 'nodejs'

const XAI_CLIENT_SECRETS_URL = 'https://api.x.ai/v1/realtime/client_secrets'
const XAI_TOKEN_RATE_BUCKETS = new Map<string, { count: number; resetAt: number }>()

function normalizeKey(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, '')
}

export async function POST(req: NextRequest) {
  try {
    if (
      !checkIpRateLimit({
        buckets: XAI_TOKEN_RATE_BUCKETS,
        ip: clientIpFromRequest(req.headers),
        windowMs: 60_000,
        max: 30,
      })
    ) {
      return NextResponse.json(
        { error: 'rate_limit', userMessage: 'Слишком много запросов. Подождите.' },
        { status: 429 }
      )
    }

    const key = normalizeKey(process.env.XAI_API_KEY ?? '')
    if (!key) {
      return NextResponse.json(
        { error: 'XAI_API_KEY is not set', userMessage: ENGVO_XAI_MISSING_KEY_USER_MESSAGE },
        { status: 500 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      audience?: Audience
      topic?: string
      voice?: string
      level?: string
      speed?: unknown
    }

    const audience: Audience = body.audience === 'child' ? 'child' : 'adult'
    const requestedVoice = body.voice ?? ''
    const requestedLevel = body.level ?? ''
    const requestedTopic = body.topic ?? ''
    const voice = isEngvoAllowedXaiVoice(requestedVoice) ? requestedVoice : ENGVO_XAI_DEFAULT_VOICE
    const level = isEngvoCefrLevel(requestedLevel) ? requestedLevel : ENGVO_DEFAULT_LEVEL
    const topicIds = new Set<TopicId>(TOPICS.map((item) => item.id))
    const topic = topicIds.has(requestedTopic as TopicId) ? (requestedTopic as TopicId) : 'free_talk'
    const speechSpeed =
      typeof body.speed === 'number' && Number.isFinite(body.speed)
        ? clampEngvoRealtimeSpeed(body.speed, 'xai')
        : 1

    void audience
    void level
    void topic
    void speechSpeed

    // Custom voices are team-scoped. Manifest allowlist alone is not enough — the API key
    // must own the voice, or Realtime silently synthesizes a built-in female fallback.
    if (isEngvoAllowedXaiVoice(requestedVoice) && isEngvoCustomVoiceIdFormat(requestedVoice)) {
      let ownedOk = false
      try {
        const owned = await fetchWithProxyFallback(
          `https://api.x.ai/v1/custom-voices/${requestedVoice}`,
          { headers: { Authorization: `Bearer ${key}` } }
        )
        ownedOk = owned.ok
        await owned.text().catch(() => '')
      } catch {
        ownedOk = false
      }
      if (!ownedOk) {
        return NextResponse.json(
          {
            error: 'custom_voice_unavailable_for_api_key',
            userMessage:
              'Custom voice недоступен для XAI_API_KEY (не та team или неверный voice_id). Sample в Console смотрит на логин; звонок Engvo — на API-ключ и ID в манифесте.',
          },
          { status: 403 }
        )
      }
    }

    const upstream = await fetchWithProxyFallback(XAI_CLIENT_SECRETS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 },
      }),
    })

    const rawText = await upstream.text()
    if (!upstream.ok) {
      const { userMessage, apiMessage } = resolveEngvoRealtimeUserMessage({
        raw: rawText || 'Failed to mint xAI client secret',
        httpStatus: upstream.status,
        fallback: ENGVO_XAI_TOKEN_USER_MESSAGE,
      })
      return NextResponse.json(
        {
          error: apiMessage || rawText || 'Failed to mint xAI client secret',
          userMessage,
        },
        { status: upstream.status === 401 || upstream.status === 429 ? upstream.status : 502 }
      )
    }

    type XaiSecretResponse = {
      client_secret?: string | { value?: string; expires_at?: number }
      value?: string
      expires_at?: number
      expiresAt?: number
    }
    let parsed: XaiSecretResponse
    try {
      parsed = JSON.parse(rawText) as XaiSecretResponse
    } catch {
      return NextResponse.json(
        { error: 'Invalid xAI client_secrets response', userMessage: ENGVO_XAI_TOKEN_USER_MESSAGE },
        { status: 502 }
      )
    }

    const secretObj =
      typeof parsed.client_secret === 'object' && parsed.client_secret
        ? parsed.client_secret
        : null
    const token =
      (typeof parsed.client_secret === 'string' ? parsed.client_secret : null) ||
      secretObj?.value ||
      parsed.value ||
      ''
    if (!token.trim()) {
      return NextResponse.json(
        { error: 'xAI client_secrets missing token', userMessage: ENGVO_XAI_TOKEN_USER_MESSAGE },
        { status: 502 }
      )
    }

    const expiresAt =
      secretObj?.expires_at ??
      parsed.expires_at ??
      parsed.expiresAt ??
      Math.floor(Date.now() / 1000) + 300

    return NextResponse.json({
      token: token.trim(),
      expiresAt,
      model: ENGVO_XAI_MODEL,
      voice,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'xAI token route failed'
    const { userMessage } = resolveEngvoRealtimeUserMessage({
      raw: message,
      fallback: ENGVO_XAI_TOKEN_USER_MESSAGE,
    })
    return NextResponse.json({ error: message, userMessage }, { status: 500 })
  }
}
