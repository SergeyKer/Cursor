import { fetchWithProxyFallback } from '@/lib/proxyFetch'

export const XAI_TTS_URL = 'https://api.x.ai/v1/tts'

export type XaiUnaryTtsParams = {
  apiKey: string
  text: string
  voiceId: string
  language?: string
  speed?: number
  replace?: Record<string, string>
}

export type XaiUnaryTtsResult = {
  bytes: ArrayBuffer
  contentType: string
}

export async function synthesizeXaiUnaryTts(params: XaiUnaryTtsParams): Promise<XaiUnaryTtsResult> {
  const body: Record<string, unknown> = {
    text: params.text,
    voice_id: params.voiceId,
    language: params.language ?? 'en',
    output_format: {
      codec: 'mp3',
      sample_rate: 24000,
      bit_rate: 128000,
    },
  }
  if (typeof params.speed === 'number' && Number.isFinite(params.speed)) {
    body.speed = params.speed
  }
  if (params.replace && Object.keys(params.replace).length > 0) {
    body.replace = params.replace
  }

  const response = await fetchWithProxyFallback(XAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    const err = new Error(`xAI TTS error ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
    ;(err as Error & { status?: number }).status = response.status
    throw err
  }

  const bytes = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'audio/mpeg'
  return { bytes, contentType }
}
