import { NextRequest, NextResponse } from 'next/server'
import {
  ENGVO_XAI_DEFAULT_VOICE,
  isEngvoAllowedXaiVoice,
} from '@/lib/engvo/constants'
import { ENGVO_XAI_MISSING_KEY_USER_MESSAGE } from '@/lib/engvo/errors'
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/ai/ipRateLimit'
import { clampVocabTtsSpeed } from '@/lib/vocabulary/clampVocabTtsSpeed'
import { buildVocabPronunciationReplace } from '@/lib/vocabulary/pronunciationReplace'
import { synthesizeXaiUnaryTts } from '@/lib/tts/xaiUnaryTts'

export const runtime = 'nodejs'

const MAX_TEXT_CHARS = 200
const VOCAB_TTS_RATE_BUCKETS = new Map<string, { count: number; resetAt: number }>()

function normalizeKey(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, '')
}

export async function POST(req: NextRequest) {
  try {
    if (
      !checkIpRateLimit({
        buckets: VOCAB_TTS_RATE_BUCKETS,
        ip: clientIpFromRequest(req.headers),
        windowMs: 60_000,
        max: 60,
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
    if (text.length > MAX_TEXT_CHARS) {
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
    const replace = buildVocabPronunciationReplace(text)

    const { bytes, contentType } = await synthesizeXaiUnaryTts({
      apiKey,
      text,
      voiceId,
      language: 'en',
      speed,
      replace,
    })

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    const status =
      typeof error === 'object' && error && 'status' in error && typeof (error as { status: unknown }).status === 'number'
        ? (error as { status: number }).status
        : 502
    const message = error instanceof Error ? error.message : 'TTS failed'
    return NextResponse.json(
      {
        error: 'tts_failed',
        userMessage: 'Не удалось озвучить. Попробуйте ещё раз или системный голос.',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: status >= 400 && status < 600 ? status : 502 }
    )
  }
}
