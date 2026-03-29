import type { NextRequest } from 'next/server'
import { buildProxyFetchExtra } from '@/lib/proxyFetch'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_MAX_TOKENS = 512

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

export async function callProviderChat(params: {
  provider: 'openrouter' | 'openai'
  req: NextRequest
  apiMessages: { role: string; content: string }[]
  maxTokens?: number
}): Promise<{ ok: true; content: string } | { ok: false; status: number; errText: string }> {
  const { provider, req, apiMessages, maxTokens = DEFAULT_MAX_TOKENS } = params

  if (provider === 'openai') {
    const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
    if (!key) return { ok: false, status: 500, errText: 'Missing OPENAI_API_KEY' }
    const proxyFetchExtra = await buildProxyFetchExtra()
    let res: Response
    try {
      res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: apiMessages,
          max_tokens: maxTokens,
        }),
        ...(proxyFetchExtra as RequestInit),
      } as RequestInit)
    } catch {
      return { ok: false, status: 502, errText: 'OpenAI fetch failed' }
    }
    if (!res.ok) return { ok: false, status: res.status, errText: await res.text() }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>
    }
    const first = data.choices?.[0]
    const content = (first?.message?.content ?? first?.text ?? '').trim()
    return { ok: true, content }
  }

  const key = normalizeKey(process.env.OPENROUTER_API_KEY ?? '')
  if (!key) return { ok: false, status: 500, errText: 'Missing OPENROUTER_API_KEY' }
  const res = await fetch(OPENROUTER_URL, {
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
  })
  if (!res.ok) return { ok: false, status: res.status, errText: await res.text() }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; text?: string }>
  }
  const first = data.choices?.[0]
  const content = (first?.message?.content ?? first?.text ?? '').trim()
  return { ok: true, content }
}
