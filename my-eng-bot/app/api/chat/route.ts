import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage } from '@/lib/types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
/** Максимум сообщений диалога в запросе (user+assistant). Ограничивает длину промпта, чтобы не превысить лимит контекста модели. */
const MAX_MESSAGES_IN_CONTEXT = 10

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

  const correctionRule =
    'When the user makes grammar or tense mistakes, add a short block at the start of your reply in this exact format: **Correction:** [What they used]. [Correct option]. Example: [one short example]. Then continue your normal reply in English.'

  if (mode === 'translation') {
    const tenseInstruction = tense === 'all' ? 'Use any grammar tense.' : `Use grammar tense: ${tenseName}.`
    return `You are an English translation coach. Your role:
- Give the student ONE sentence in Russian to translate into English. The sentence type must be: ${sentenceTypeName}. Keep topic around: ${topicName}. ${tenseInstruction} ${levelPrompt}
- CRITICAL — First message only: when there are no messages from the student yet, do NOT greet, do NOT ask "what shall we talk about" or similar. Immediately output ONE sentence in Russian to translate, then "Переведи на английский." Example: "Сегодня хорошая погода. Переведи на английский."
- When you give a Russian sentence to translate: write only the sentence, then always end with a short invitation in Russian, e.g. "Переведи на английский." No greetings, no extra text.
- After the student replies with their English translation, reply in plain text (no markers, no blocks):
  * If the translation is CORRECT: one short praise in English (e.g. "Well done!"), then on a new line the next Russian sentence, then "Переведи на английский."
  * If the translation has ERRORS: one brief sentence in English with the correct form or a short tip (e.g. "Use 'works' for he/she: He works in the office."), then on a new line the next Russian sentence, then "Переведи на английский."
- One short comment only. No **Correction:**, no **Right:**, no lists. Just: comment + next sentence + invitation.`
  }

  const tenseInstruction =
    tense === 'all'
      ? 'Use any tenses naturally in the conversation; no focus on a specific tense.'
      : `Focus the conversation so the student naturally uses ${tenseName}; you use it in your replies where natural.`
  return `You are a friendly English tutor. Have a natural conversation in English with the student.
- Topic: ${topicName}. ${levelPrompt}
- ${tenseInstruction}
- ${correctionRule}
- CRITICAL: Every reply must be 1–2 short sentences only. Never write multiple paragraphs. Never list options (e.g. "contemporary, hip-hop, ballroom"). Ask only ONE simple question per message. No long introductions.
- When you start the conversation (your first message): open with one short, friendly question that fits the topic and invites the user to answer. Make it interesting and easy to reply to — so the dialogue gets going naturally.`
}

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

export async function POST(req: NextRequest) {
  try {
    const rawKey =
      req.headers.get('x-openrouter-key')?.trim() ||
      process.env.OPENROUTER_API_KEY ||
      ''
    const key = normalizeKey(rawKey)
    if (!key) {
      return NextResponse.json(
        { error: 'Укажите ключ OpenRouter в меню настроек или в OPENROUTER_API_KEY' },
        { status: 400 }
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
        max_tokens: 120,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      let userMessage: string
      if (res.status === 401) {
        userMessage = 'Неверный ключ OpenRouter. Проверьте ключ в меню настроек.'
      } else if (res.status === 429) {
        userMessage = 'Превышен лимит запросов. Подождите немного и попробуйте снова.'
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
