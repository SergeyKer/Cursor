import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/key'

const FREE_LIMIT_NO_CREDITS = 50
const FREE_LIMIT_WITH_CREDITS = 1000

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

export async function GET(req: NextRequest) {
  try {
    const key = normalizeKey(process.env.OPENROUTER_API_KEY ?? '')
    if (!key) {
      return NextResponse.json(
        { used: 0, limit: FREE_LIMIT_NO_CREDITS },
        { status: 200 }
      )
    }

    const res = await fetch(OPENROUTER_KEY_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { used: 0, limit: FREE_LIMIT_NO_CREDITS },
        { status: 200 }
      )
    }

    const data = (await res.json()) as {
      data?: {
        usage_daily?: number
        is_free_tier?: boolean
      }
    }

    const used = typeof data.data?.usage_daily === 'number' ? data.data.usage_daily : 0
    const limit = data.data?.is_free_tier === false ? FREE_LIMIT_WITH_CREDITS : FREE_LIMIT_NO_CREDITS

    return NextResponse.json({ used, limit })
  } catch {
    return NextResponse.json(
      { used: 0, limit: FREE_LIMIT_NO_CREDITS },
      { status: 200 }
    )
  }
}
