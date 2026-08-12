import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/proxyFetch', () => ({
  fetchWithProxyFallback: vi.fn(),
}))

import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import { fetchXaiTtsPcmBytes } from '@/lib/tts/xaiHttpTts'
import { TTS_PCM_SAMPLE_RATE } from '@/lib/tts/xaiStreamTts'

describe('fetchXaiTtsPcmBytes', () => {
  const fetchMock = fetchWithProxyFallback as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('posts pcm body through proxy fetch', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 })
    )
    const bytes = await fetchXaiTtsPcmBytes({
      apiKey: 'xai-test',
      text: 'Hi',
      voiceId: 'luna',
      speed: 1,
    })
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.x.ai/v1/tts')
    const parsed = JSON.parse(String((init as RequestInit).body)) as {
      voice_id: string
      output_format: { codec: string; sample_rate: number }
    }
    expect(parsed.voice_id).toBe('luna')
    expect(parsed.output_format).toEqual({ codec: 'pcm', sample_rate: TTS_PCM_SAMPLE_RATE })
  })
})
