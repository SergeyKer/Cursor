import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage } from '@/lib/types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
/** Максимум сообщений в контексте (user+assistant). Для короткой игры хватает последнего обмена. */
const MAX_MESSAGES_IN_CONTEXT = 2
/** Лимит токенов ответа. 120 обрезало ответы; для 1–2 коротких фраз хватает 200. */
const MAX_RESPONSE_TOKENS = 200

const LEVEL_PROMPTS: Record<string, string> = {
  starter:
    'Use only very simple words and short sentences. Suitable for first-year learners or children.',
  a1: 'Use vocabulary and grammar appropriate for A1 (beginner).',
  a2: 'Use vocabulary and grammar appropriate for A2 (elementary).',
  b1: 'Use vocabulary and grammar appropriate for B1 (intermediate).',
  b2: 'Use vocabulary and grammar appropriate for B2 (upper intermediate).',
  c1: 'Use vocabulary and grammar appropriate for C1 (advanced).',
  c2: 'Use vocabulary and grammar appropriate for C2 (proficient).',
}

const TENSE_NAMES: Record<string, string> = {
  all: 'any tense',
  present_simple: 'Present Simple',
  present_continuous: 'Present Continuous',
  present_perfect: 'Present Perfect',
  present_perfect_continuous: 'Present Perfect Continuous',
  past_simple: 'Past Simple',
  past_continuous: 'Past Continuous',
  past_perfect: 'Past Perfect',
  past_perfect_continuous: 'Past Perfect Continuous',
  future_simple: 'Future Simple',
  future_continuous: 'Future Continuous',
  future_perfect: 'Future Perfect',
  future_perfect_continuous: 'Future Perfect Continuous',
}

const TOPIC_NAMES: Record<string, string> = {
  travel: 'Travel',
  work: 'Work',
  daily_life: 'Daily life',
  food: 'Food',
  culture: 'Culture',
  technology: 'Technology',
  free_talk: 'Free talk (any topic)',
}

const SENTENCE_TYPE_NAMES: Record<string, string> = {
  general: 'affirmative (general)',
  interrogative: 'interrogative (questions)',
  negative: 'negative',
  mixed: 'mixed (affirmative, interrogative, negative)',
}

function buildSystemPrompt(params: {
  mode: string
  sentenceType?: string
  topic: string
  level: string
  tense: string
}): string {
  const { mode, sentenceType, topic, level, tense } = params
  const levelPrompt = LEVEL_PROMPTS[level] ?? LEVEL_PROMPTS.a1
  const tenseName = TENSE_NAMES[tense] ?? 'Present Simple'
  const topicName = TOPIC_NAMES[topic] ?? 'general'
  const sentenceTypeName = sentenceType ? SENTENCE_TYPE_NAMES[sentenceType] ?? 'mixed' : 'mixed'

  if (mode === 'translation') {
    return `Translate: ${topicName}, ${levelPrompt}, ${sentenceTypeName}. One RU sentence, then "Переведи на английский." Reply: short praise or tip + next sentence. Keep very short.`
  }
  return `English tutor. ${topicName}. ${levelPrompt}. ${tense === 'all' ? 'Any tense.' : tenseName + '.'} Reply in 1–2 short sentences. If error: **Correction:** [wrong]→[right]. Start with one short question.`
}

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
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
    const topic = body.topic ?? 'free_talk'
    const level = body.level ?? 'a1'
    const tense = body.tense ?? 'present_simple'
    const mode = body.mode ?? 'dialogue'
    const sentenceType = body.sentenceType ?? 'mixed'

    const systemPrompt = buildSystemPrompt({
      mode,
      sentenceType,
      topic,
      level,
      tense,
    })

    const recentMessages = messages
      .filter((m: ChatMessage) => m.role !== 'system')
      .slice(-MAX_MESSAGES_IN_CONTEXT)
    const apiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
    ]

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
        max_tokens: MAX_RESPONSE_TOKENS,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      let userMessage: string
      if (res.status === 401) {
        userMessage = 'Неверный ключ OpenRouter. Проверьте ключ в меню настроек.'
      } else if (res.status === 429) {
        userMessage = 'Превышен лимит запросов OpenRouter. На бесплатном тарифе: не более 200 запросов в день и 20 в минуту. Подождите минуту или попробуйте завтра.'
      } else {
        userMessage = 'Сервис ИИ временно недоступен. Проверьте сеть и ключ в меню, попробуйте позже.'
      }
      return NextResponse.json(
        { error: userMessage, details: errText },
        { status: res.status }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string }
        text?: string
        finish_reason?: string
        native_finish_reason?: string
      }>
    }
    const first = data.choices?.[0]
    const content =
      (first?.message?.content ?? first?.text ?? '').trim()

    if (!content) {
      const reason = { finish_reason: first?.finish_reason, native_finish_reason: first?.native_finish_reason }
      console.warn('[chat] Пустой ответ OpenRouter:', reason)
      const isLengthLimit = first?.finish_reason === 'length' || first?.native_finish_reason === 'length'
      const errorMessage = isLengthLimit
        ? 'Диалог слишком длинный. Начните новый диалог (меню → Новый диалог).'
        : 'Модель вернула пустой ответ. Попробуйте отправить сообщение ещё раз.'
      return NextResponse.json(
        { error: errorMessage },
        { status: 502 }
      )
    }

    return NextResponse.json({ content })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
