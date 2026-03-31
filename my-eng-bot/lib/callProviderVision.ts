import type { NextRequest } from 'next/server'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import type { AiProvider } from '@/lib/types'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

export async function callProviderVision(params: {
  provider: AiProvider
  req: NextRequest
  imageDataUrl: string
  prompt: string
}): Promise<{ ok: true; content: string } | { ok: false; status: number; errText: string }> {
  const { provider, imageDataUrl, prompt } = params

  // В текущей конфигурации OpenRouter использует free-модель без гарантии vision.
  if (provider === 'openrouter') {
    return { ok: false, status: 400, errText: 'Для анализа фото выберите провайдера ChatGPT (OpenAI).' }
  }

  const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
  if (!key) return { ok: false, status: 500, errText: 'Missing OPENAI_API_KEY' }

  let res: Response
  try {
    res = await fetchWithProxyFallback(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 700,
      }),
    })
  } catch {
    return { ok: false, status: 502, errText: 'OpenAI vision fetch failed' }
  }

  if (!res.ok) {
    return { ok: false, status: res.status, errText: await res.text() }
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; text?: string }>
  }
  const first = data.choices?.[0]
  const content = (first?.message?.content ?? first?.text ?? '').trim()
  return { ok: true, content }
}
