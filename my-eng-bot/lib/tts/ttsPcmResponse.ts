import { NextResponse } from 'next/server'
import { TTS_PCM_CONTENT_TYPE, openXaiTtsPcmStream } from '@/lib/tts/xaiStreamTts'
import { fetchXaiTtsPcmBytes } from '@/lib/tts/xaiHttpTts'
import { serverHasXaiProxyEnv } from '@/lib/engvo/xaiTransportMode'

export const ENGVO_TTS_MODE_HEADER = 'X-Engvo-Tts-Mode'
export const ENGVO_TTS_MODE_UNARY = 'unary'
export const ENGVO_TTS_MODE_STREAM = 'stream'

export async function ttsPcmResponse(params: {
  apiKey: string
  text: string
  voiceId: string
  speed: number
  replace?: Record<string, string>
}): Promise<Response> {
  const headers = {
    'Content-Type': TTS_PCM_CONTENT_TYPE,
    'Cache-Control': 'no-store',
  }

  // Local VPN/Xray: HTTP TTS (WS frames die on the proxy). Vercel: WS stream, same $15/1M chars.
  if (serverHasXaiProxyEnv()) {
    const bytes = await fetchXaiTtsPcmBytes(params)
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    return new Response(body, {
      status: 200,
      headers: {
        ...headers,
        'Content-Length': String(bytes.byteLength),
        [ENGVO_TTS_MODE_HEADER]: ENGVO_TTS_MODE_UNARY,
      },
    })
  }

  return new Response(openXaiTtsPcmStream(params), {
    status: 200,
    headers: {
      ...headers,
      [ENGVO_TTS_MODE_HEADER]: ENGVO_TTS_MODE_STREAM,
    },
  })
}

export function ttsFailedResponse(error: unknown): NextResponse {
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
