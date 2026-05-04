import type { NextRequest } from 'next/server'
import {
  fetchWithLessonProviderDeadline,
  isLessonProviderAbortError,
} from '@/lib/lessonProviderTimeouts'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import type { AiProvider, OpenAiChatPreset } from '@/lib/types'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

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
  openAiChatPreset?: OpenAiChatPreset
}): Promise<{ ok: true; content: string } | { ok: false; status: number; errText: string }> {
  const { provider, imageDataUrl, prompt, openAiChatPreset = 'gpt-4o-mini' } = params

  // В текущей конфигурации OpenRouter использует free-модель без гарантии vision.
  if (provider === 'openrouter') {
    return { ok: false, status: 400, errText: 'Для анализа фото выберите провайдера ChatGPT (OpenAI).' }
  }

  const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
  if (!key) return { ok: false, status: 500, errText: 'Missing OPENAI_API_KEY' }

  let res: Response
  try {
    res = await fetchWithLessonProviderDeadline((signal) =>
      fetchWithProxyFallback(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        signal,
        body: JSON.stringify({
          model:
            openAiChatPreset === 'gpt-5.4-mini-none' || openAiChatPreset === 'gpt-5.4-mini-low'
              ? 'gpt-5.4-mini'
              : 'gpt-4o-mini',
          ...(openAiChatPreset === 'gpt-5.4-mini-none'
            ? { reasoning_effort: 'none' }
            : openAiChatPreset === 'gpt-5.4-mini-low'
              ? { reasoning_effort: 'low' }
              : {}),
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
    )
  } catch (error) {
    if (isLessonProviderAbortError(error)) {
      return { ok: false, status: 504, errText: 'OpenAI vision request timed out' }
    }
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
