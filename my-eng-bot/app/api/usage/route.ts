import { NextResponse } from 'next/server'

const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key'
const USAGE_CACHE_TTL_MS = 60_000

let usageCache:
  | {
      expiresAt: number
      payload: { used: number; limit: number }
    }
  | null = null

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

export async function GET() {
  try {
    const now = Date.now()
    if (usageCache && usageCache.expiresAt > now) {
      return NextResponse.json(usageCache.payload, { status: 200 })
    }

    const key = normalizeKey(process.env.OPENROUTER_API_KEY ?? '')
    if (!key) {
      const payload = { used: 0, limit: 0 }
      usageCache = { expiresAt: now + USAGE_CACHE_TTL_MS, payload }
      return NextResponse.json(payload, { status: 200 })
    }

    const res = await fetch(OPENROUTER_KEY_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })

    if (!res.ok) {
      const payload = { used: 0, limit: 0 }
      usageCache = { expiresAt: now + USAGE_CACHE_TTL_MS, payload }
      return NextResponse.json(payload, { status: 200 })
    }

    const data = (await res.json()) as {
      data?: {
        usage_daily?: number
        is_free_tier?: boolean
      }
    }

    const used = typeof data.data?.usage_daily === 'number' ? data.data.usage_daily : 0
    const payload = { used, limit: 0 }
    usageCache = { expiresAt: now + USAGE_CACHE_TTL_MS, payload }
    return NextResponse.json(payload)
  } catch {
    const payload = { used: 0, limit: 0 }
    usageCache = { expiresAt: Date.now() + USAGE_CACHE_TTL_MS, payload }
    return NextResponse.json(payload, { status: 200 })
  }
}
