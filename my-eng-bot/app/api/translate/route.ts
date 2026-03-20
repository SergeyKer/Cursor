import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

function normalizeTranslationResult(text: string): string {
  const normalized = text
    .replace(
      /(^|\b)(Привет!\s*)?Как\s+(ты|вы)\s+обычно\s+заним(аешься|аетесь)\s+([^.?!]+?)([?.!])?(?=\s|$)/gi,
      (_, prefix: string, greeting: string, pronoun: string, _verb: string, topic: string) => {
        const isYou = pronoun.toLowerCase() === 'ты'
        const subject = isYou ? 'ты' : 'вы'
        const verb = isYou ? 'делаешь' : 'делаете'
        return `${prefix}${greeting ?? ''}Что ${subject} обычно ${verb}, когда речь заходит о ${topic.trim()}?`
      }
    )
    .replace(/\bзаниматься культурой\b/gi, 'интересоваться культурой')
    .replace(/\bзанимаешься культурой\b/gi, 'интересуешься культурой')
    .replace(/\bзанимаетесь культурой\b/gi, 'интересуетесь культурой')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

type Provider = 'openrouter' | 'openai'

function classifyOpenAiForbidden(errText: string): 'unsupported_region' | 'other' {
  try {
    const parsed = JSON.parse(errText) as { error?: { code?: string } }
    if (parsed?.error?.code === 'unsupported_country_region_territory') return 'unsupported_region'
  } catch {
    // ignore
  }
  if (/unsupported_country_region_territory/i.test(errText)) return 'unsupported_region'
  return 'other'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const provider: Provider = body.provider === 'openai' ? 'openai' : 'openrouter'
    const audience: 'child' | 'adult' = body.audience === 'child' ? 'child' : 'adult'
    if (!text) {
      return NextResponse.json({ error: 'Текст для перевода не передан' }, { status: 400 })
    }

    const form = audience === 'child' ? 'Use informal address (ты).' : 'Use polite address (вы).'
    const system =
      'You are a professional Russian translator. Translate the user text into natural conversational Russian, not a literal word-for-word translation. Preserve meaning, tone, and intent. ' +
      form +
      ' Avoid bureaucratic or robotic phrases like "связанное с", "в отношении", "касаемо", "по части". If the English is a question, translate it as a clear question a real person would ask. ' +
      'Prefer idiomatic Russian over literal structure. For example, translate "What do you usually do about culture?" as a natural question like "Что ты обычно делаешь, когда речь заходит о культуре?" rather than "Как ты обычно занимаешься культурой?". ' +
      'For questions like "What is your favorite food?" use idiomatic patterns such as "Какая у тебя/у вас любимая еда?" instead of awkward phrases like "Что такое ваша любимая еда?". ' +
      'For English questions with "what ... in" (e.g. "What are you swimming in?") keep the preposition in Russian: use "В чём ...?" — never "Что ты плаваешь?" which loses the meaning. ' +
      'Important: in conversational prompts like "Just start, and I will follow." translate "I will follow" idiomatically as "я подхвачу/я продолжу/я поддержу разговор" depending on context. ' +
      'Reply only with the translation, without explanations, quotes, or extra words.'
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ]

    const res = await (async () => {
      if (provider === 'openai') {
        const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
        if (!key) {
          return NextResponse.json(
            { error: 'На сервере не задан OPENAI_API_KEY' },
            { status: 500 }
          )
        }
        return fetch(OPENAI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages,
            max_tokens: 300,
          }),
        })
      }

      const key = normalizeKey(process.env.OPENROUTER_API_KEY ?? '')
      if (!key) {
        return NextResponse.json(
          { error: 'На сервере не задан OPENROUTER_API_KEY' },
          { status: 500 }
        )
      }
      return fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': req.nextUrl?.origin ?? '',
        },
        body: JSON.stringify({
          model: FREE_MODEL,
          messages,
          max_tokens: 300, // типичный перевод 5–30 токенов, резерв большой
        }),
      })
    })()

    if (res instanceof NextResponse) return res

    if (!res.ok) {
      const errText = await res.text()
      const userMessage =
        res.status === 429
          ? 'Превышен лимит запросов. Попробуйте позже.'
          : res.status === 401
            ? provider === 'openai'
              ? 'Неверный ключ OpenAI. Проверьте OPENAI_API_KEY.'
              : 'Неверный ключ OpenRouter. Проверьте OPENROUTER_API_KEY.'
            : res.status === 403 && provider === 'openai'
              ? classifyOpenAiForbidden(errText) === 'unsupported_region'
                ? 'OpenAI недоступен из вашего региона (403 unsupported_country_region_territory). Переключитесь на OpenRouter или используйте деплой (например, Vercel) в поддерживаемом регионе.'
                : 'Доступ к OpenAI запрещён (403). Проверьте доступность сервиса в вашем регионе и права проекта/аккаунта.'
            : 'Не удалось получить перевод.'

      const errorCode: 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error' =
        res.status === 429
          ? 'rate_limit'
          : res.status === 401
            ? 'unauthorized'
            : res.status === 403 && provider === 'openai'
              ? 'forbidden'
              : 'upstream_error'
      return NextResponse.json(
        { error: userMessage, errorCode, provider, details: errText },
        { status: res.status }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>
    }
    const first = data.choices?.[0]
    const content = normalizeTranslationResult((first?.message?.content ?? first?.text ?? '').trim())

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
