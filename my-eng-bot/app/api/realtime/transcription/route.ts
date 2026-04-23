import { NextRequest, NextResponse } from 'next/server'
import { normalizeSttLanguage, SttError } from '@/lib/stt'

export const runtime = 'nodejs'

const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls'

function normalizeKey(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, '')
}

function buildRealtimeTranscriptionSession(language: string) {
  return {
    type: 'transcription',
    audio: {
      input: {
        noise_reduction: {
          type: 'near_field',
        },
        transcription: {
          model: 'gpt-4o-mini-transcribe',
          language: normalizeSttLanguage(language),
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: false,
        },
      },
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
    if (!key) throw new SttError('missing_key', 'Missing OPENAI_API_KEY', 500)

    const body = (await req.json()) as { sdp?: string; language?: string }
    const sdp = (body.sdp ?? '').trim()
    if (!sdp) {
      return NextResponse.json({ error: 'SDP offer is required' }, { status: 400 })
    }

    const form = new FormData()
    form.append('sdp', sdp)
    form.append('session', JSON.stringify(buildRealtimeTranscriptionSession(body.language ?? 'en')))

    const response = await fetch(OPENAI_REALTIME_CALLS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: form,
    })

    const answerSdp = await response.text()
    if (!response.ok || !answerSdp.trim()) {
      return NextResponse.json(
        { error: answerSdp || 'Failed to initialize realtime transcription' },
        { status: response.status || 502 }
      )
    }

    return NextResponse.json({ sdp: answerSdp })
  } catch (error) {
    if (error instanceof SttError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
