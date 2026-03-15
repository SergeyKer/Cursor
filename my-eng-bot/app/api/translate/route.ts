import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

export async function POST(req: NextRequest) {
  try {
    const key = normalizeKey(process.env.OPENROUTER_API_KEY ?? '')
    if (!key) {
      return NextResponse.json(
        { error: 'На сервере не задан OPENROUTER_API_KEY' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'Текст для перевода не передан' }, { status: 400 })
    }

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': req.nextUrl?.origin ?? '',
      },
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [
          { role: 'system', content: 'Translate the following to Russian. Reply only with the full translation of the whole text, one sentence or phrase. Do not truncate or cut off.' },
          { role: 'user', content: text },
        ],
        max_tokens: 300,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      const userMessage =
        res.status === 429
          ? 'Превышен лимит запросов. Попробуйте позже.'
          : 'Не удалось получить перевод.'
      return NextResponse.json(
        { error: userMessage, details: errText },
        { status: res.status }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>
    }
    const first = data.choices?.[0]
    const content = (first?.message?.content ?? first?.text ?? '').trim()

    if (!content) {
      return NextResponse.json(
        { error: 'Модель вернула пустой перевод.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ content })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка при переводе' },
      { status: 500 }
    )
  }
}
