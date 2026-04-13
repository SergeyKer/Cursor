import type { NextRequest } from 'next/server'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import type { OpenAiChatPreset } from '@/lib/types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_MAX_TOKENS = 512

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

function hasExplicitEnvProxy(): boolean {
  const value =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    ''
  return value.trim().length > 0
}

export async function callProviderChat(params: {
  provider: 'openrouter' | 'openai'
  req: NextRequest
  apiMessages: { role: string; content: string }[]
  maxTokens?: number
  openAiChatPreset?: OpenAiChatPreset
}): Promise<{ ok: true; content: string } | { ok: false; status: number; errText: string }> {
  const { provider, req, apiMessages, maxTokens = DEFAULT_MAX_TOKENS, openAiChatPreset = 'gpt-4o-mini' } = params

  if (provider === 'openai') {
    const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
    if (!key) return { ok: false, status: 500, errText: 'Missing OPENAI_API_KEY' }
    const isGpt54Preset = openAiChatPreset === 'gpt-5.4-mini-none' || openAiChatPreset === 'gpt-5.4-mini-low'
    const reasoningEffort = openAiChatPreset === 'gpt-5.4-mini-none' ? 'none' : openAiChatPreset === 'gpt-5.4-mini-low' ? 'low' : undefined
    const openAiBody = isGpt54Preset
      ? {
          model: 'gpt-5.4-mini',
          reasoning: { effort: reasoningEffort },
          input: apiMessages.map((m) => ({ role: m.role, content: m.content })),
          max_output_tokens: maxTokens,
        }
      : {
          model: 'gpt-4o-mini',
          messages: apiMessages,
          max_tokens: maxTokens,
        }
    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(openAiBody),
    }
    const preferProxy = hasExplicitEnvProxy()
    let res: Response

    try {
      if (preferProxy) {
        // При явном VPN/прокси из env сначала идём через прокси.
        // Если прокси недоступен, делаем прямой fallback.
        try {
          res = await fetchWithProxyFallback(isGpt54Preset ? OPENAI_RESPONSES_URL : OPENAI_URL, requestInit)
        } catch {
          res = await fetch(isGpt54Preset ? OPENAI_RESPONSES_URL : OPENAI_URL, requestInit)
        }
      } else {
        // Без прокси сначала пробуем прямой канал и затем прокси-кандидаты.
        res = await fetchWithProxyFallback(isGpt54Preset ? OPENAI_RESPONSES_URL : OPENAI_URL, requestInit, { directFirst: true })
      }
    } catch {
      return { ok: false, status: 502, errText: 'OpenAI fetch failed' }
    }
    if (!res.ok) return { ok: false, status: res.status, errText: await res.text() }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>
      output_text?: string
      output?: Array<{ content?: Array<{ text?: string }> }>
    }
    const content = (
      data.output_text ??
      data.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? '').join('\n') ??
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      ''
    ).trim()
    return { ok: true, content }
  }

  const key = normalizeKey(process.env.OPENROUTER_API_KEY ?? '')
  if (!key) return { ok: false, status: 500, errText: 'Missing OPENROUTER_API_KEY' }
  let res: Response
  try {
    res = await fetchWithProxyFallback(
      OPENROUTER_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': req.nextUrl?.origin ?? '',
        },
        body: JSON.stringify({
          model: FREE_MODEL,
          messages: apiMessages,
          max_tokens: maxTokens,
        }),
      },
      {
        // OpenRouter не должен зависеть от системного прокси Windows.
        // Если задан явный env-прокси — можно попробовать его после прямого канала.
        includeSystemProxy: false,
        directFirst: true,
      }
    )
  } catch (error) {
    const errText = error instanceof Error ? `OpenRouter fetch failed: ${error.message}` : 'OpenRouter fetch failed'
    return { ok: false, status: 502, errText }
  }
  if (!res.ok) return { ok: false, status: res.status, errText: await res.text() }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; text?: string }>
  }
  const first = data.choices?.[0]
  const content = (first?.message?.content ?? first?.text ?? '').trim()
  return { ok: true, content }
}
