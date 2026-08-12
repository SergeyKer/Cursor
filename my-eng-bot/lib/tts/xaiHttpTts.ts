import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import { TTS_PCM_SAMPLE_RATE, type XaiStreamTtsParams } from '@/lib/tts/xaiStreamTts'

const XAI_TTS_HTTP_URL = 'https://api.x.ai/v1/tts'

export async function fetchXaiTtsPcmBytes(params: XaiStreamTtsParams): Promise<Uint8Array> {
  const { apiKey, text, voiceId, speed, replace } = params
  const body: Record<string, unknown> = {
    text,
    voice_id: voiceId,
    language: 'en',
    speed,
    output_format: {
      codec: 'pcm',
      sample_rate: TTS_PCM_SAMPLE_RATE,
    },
  }
  if (replace && Object.keys(replace).length > 0) {
    body.replace = replace
  }

  const response = await fetchWithProxyFallback(XAI_TTS_HTTP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = new Error(`xAI TTS HTTP ${response.status}`)
    ;(err as Error & { status?: number }).status = response.status
    throw err
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength < 2) {
    throw new Error('xAI TTS empty http body')
  }
  return bytes
}
