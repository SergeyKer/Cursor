import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage } from '@/lib/types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'

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
- Write ONLY the Russian sentence (no English, no instructions in that message). Keep it short.
- After the student replies with their English translation, give brief feedback: if correct, say so briefly and give the next Russian sentence. If there are errors, use this format first: **Correction:** [what they used / error]. [Correct form]. Example: [example]. Then give the next Russian sentence.
- Always respond in English when giving feedback; the sentence to translate is in Russian only.
- One round = either one Russian sentence to translate, OR feedback + next Russian sentence. Keep feedback brief: one short correction block and the next sentence; no long explanations.`
  }

  const tenseInstruction =
    tense === 'all'
      ? 'Use any tenses naturally in the conversation; no focus on a specific tense.'
      : `Focus the conversation so the student naturally uses ${tenseName}; you use it in your replies where natural.`
  return `You are a friendly English tutor. Have a natural conversation in English with the student.
- Topic: ${topicName}. ${levelPrompt}
- ${tenseInstruction}
- ${correctionRule}
- CRITICAL: Every reply must be 1–2 short sentences only. Never write multiple paragraphs. Never list options (e.g. "contemporary, hip-hop, ballroom"). Ask only ONE simple question per message. No long introductions.`
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

    const apiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter((m: ChatMessage) => m.role !== 'system')
        .map((m: ChatMessage) => ({ role: m.role, content: m.content })),
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
      return NextResponse.json(
        { error: 'OpenRouter error', details: errText },
        { status: res.status }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content =
      data.choices?.[0]?.message?.content?.trim() ?? ''

    return NextResponse.json({ content })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
