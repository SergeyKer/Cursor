import { NextRequest, NextResponse } from 'next/server'
import {
  ENGVO_XAI_DEFAULT_VOICE,
  isEngvoAllowedXaiVoice,
} from '@/lib/engvo/constants'
import { ENGVO_XAI_MISSING_KEY_USER_MESSAGE } from '@/lib/engvo/errors'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'
import { clampVocabTtsSpeed } from '@/lib/vocabulary/clampVocabTtsSpeed'
import { ttsFailedResponse, ttsPcmResponse } from '@/lib/tts/ttsPcmResponse'
import { COMMUNICATION_TTS_MAX_CHARS } from '@/lib/communication/ttsLimits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

const COMMUNICATION_TTS_RATE_BUCKETS = new Map<string, { count: number; resetAt: number }>()

function normalizeKey(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, '')
}

export async function POST(req: NextRequest) {
  try {
    if (
      !checkIpRateLimit({
        buckets: COMMUNICATION_TTS_RATE_BUCKETS,
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

    const apiKey = normalizeKey(process.env.XAI_API_KEY ?? '')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'XAI_API_KEY is not set', userMessage: ENGVO_XAI_MISSING_KEY_USER_MESSAGE },
        { status: 500 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      text?: unknown
      voice_id?: unknown
      speed?: unknown
    }

    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) {
      return NextResponse.json(
        { error: 'empty_text', userMessage: 'Пустой текст для озвучки.' },
        { status: 400 }
      )
    }
    if (text.length > COMMUNICATION_TTS_MAX_CHARS) {
      return NextResponse.json(
        { error: 'text_too_long', userMessage: 'Текст слишком длинный для озвучки.' },
        { status: 400 }
      )
    }

    const requestedVoice = typeof body.voice_id === 'string' ? body.voice_id.trim() : ''
    const voiceId = isEngvoAllowedXaiVoice(requestedVoice) ? requestedVoice : ENGVO_XAI_DEFAULT_VOICE
    const speed =
      typeof body.speed === 'number' && Number.isFinite(body.speed)
        ? clampVocabTtsSpeed(body.speed)
        : 1

    return await ttsPcmResponse({
      apiKey,
      text,
      voiceId,
      speed,
    })
  } catch (error) {
    return ttsFailedResponse(error)
  }
}
