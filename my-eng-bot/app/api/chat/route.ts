import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage } from '@/lib/types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
/** Максимум сообщений в контексте (user+assistant). 4 = два последних обмена. */
const MAX_MESSAGES_IN_CONTEXT = 4
/** Лимит токенов ответа. С запасом на перевод **RU:** после основного текста. */
const MAX_RESPONSE_TOKENS = 280

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
  free_talk: 'Free talk (any topic)',
  business: 'Business',
  family_friends: 'Family and friends',
  hobbies: 'Hobbies and interests',
  movies_series: 'Movies and series',
  music: 'Music',
  sports: 'Sports and active lifestyle',
  food: 'Food',
  culture: 'Culture',
  daily_life: 'Daily life',
  travel: 'Travel',
  work: 'Work',
  technology: 'Technology',
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
    return `Translation training. Topic: ${topicName}, ${levelPrompt}, ${sentenceTypeName}.

When the conversation is empty (you are sending the first message): output ONLY one Russian sentence and "Переведи на английский." Do NOT add praise, commentary, or the correct English translation. The user must answer first.

When the user has already sent their translation (there is a user message after your last one): reply with short praise or a correction tip, then give the NEXT Russian sentence and "Переведи на английский." Do not repeat the correct English for the previous sentence. Keep very short.`
  }
  const tenseRule =
    tense === 'all'
      ? 'Any tense is fine.'
      : `Strict: the user must answer in ${tenseName}. If they use another tense (e.g. you asked in Present Simple but they answered in Present Continuous), treat it as an error: give **Correction:** with the sentence in ${tenseName} and **Comment:** in Russian (e.g. that the answer must be in ${tenseName}). Do not say "Правильно" for a sentence that is in the wrong tense. Your OWN example sentences and follow‑up questions must also use ${tenseName} wherever it is natural. Do not casually switch your questions to another tense (for example, if ${tenseName} is Future Perfect Continuous, keep asking about the future in Future Perfect Continuous, not in Present Simple).`
  const capitalizationRule =
    'Completely ignore capitalization differences in the USER answer (upper/lower case). If the only difference between the user answer and the correct sentence is capitalization (for example "my favorite food..." vs "My favorite food..."), treat the answer as 100% correct and do NOT add any comment, hint or reminder about capitalization at all. Never mention capital letters or starting the sentence with a capital letter. The user often dictates text by voice: do NOT criticize missing capitalization or punctuation in the user answer. HOWEVER, your OWN replies must always use normal English capitalization and punctuation: start sentences with a capital letter and use standard sentence boundaries.';
  const freeTalkRule =
    topic === 'free_talk'
      ? `This is a free conversation. For your very first question, invite the user to choose any topic or to just start talking. Vary the wording each time — use different phrasings, for example: "What would you like to talk about today? You can name any topic, or just start, and I will follow." / "What shall we talk about? Pick any topic or simply start — I'll join in." / "What's on your mind today? Any topic works, or just begin and I'll keep up." / "What would you like to discuss? Name a topic or start talking, and I'll follow." / "We can talk about anything. Name a topic or start, and I'll go with you." Do NOT list specific options as a fixed menu. Instead, listen to what the user writes and infer the main topic yourself (for example, food, work, travel, hobbies, family, movies, music, sports) and then keep the rest of the dialogue mainly on that topic.`
      : ''
  return `English tutor. Topic: ${topicName}. ${levelPrompt}. ${tense === 'all' ? 'Any tense.' : 'Required tense: ' + tenseName + '.'} ${tenseRule} ${capitalizationRule} ${freeTalkRule} Keep the dialogue on topic: if the user's answer clearly doesn't fit (e.g. topic Food but they name a non-food like "table"), gently say so and ask for a fitting answer.

The user often dictates long answers by voice and may not use commas. Do NOT treat missing commas or minor punctuation issues as errors by themselves. If the tense, word order and key grammar are correct, consider the answer correct; you may very briefly mention punctuation only as an optional note.

When there are grammar or spelling problems or the user used the wrong tense, respond in the following human‑readable format, without any technical Markdown markers like **Correction:** or **Comment:**:

1) If you want to show the correct version, start a new line with: "Правильно: " and then give the corrected sentence or short corrected paragraph in English.
2) If you want to give an explanation, start the next line with: "Комментарий: " and give one very short explanation in Russian (1–2 short Russian sentences maximum). Do NOT put English sentences inside the comment text.
3) Use "Повтори: " only when the user made a real mistake (wrong tense, grammar, or wording) and you gave a correction. After the correction/comment add "Повтори: " and the correct English sentence. In that case do NOT add a follow‑up question — the user must repeat the corrected sentence first.
4) When the user's answer is already correct: you may give brief praise and/or suggest an optional improvement in "Комментарий:" (e.g. a more precise word, adding an adjective — "Можно сказать: I am washing the dirty dishes."). Do NOT add "Повтори:" for that; go straight to the next question in English. Optional improvements are welcome, but never force a repeat cycle for correct answers.

Never add raw markers like **Correction:**, **Comment:**, **Right:** or similar anywhere in the visible text. The user should never see those words with asterisks.

If the user clearly asks YOU a simple personal-style question about preferences or experience (e.g. "And you?", "What is your favorite food?", "Do you like tea?"), you may briefly answer in the first person (1 short sentence in English) BEFORE or AFTER the user's correction block, and then still ask them the next question. The goal is to keep the conversation natural and two‑sided, but remember: the main focus is always on the user's practice, not on talking about yourself.

Never use "Tell me" or other English instruction phrases. After a correction, you may optionally add a short Russian prompt like "Повтори: " + the correct English sentence so the user can repeat it, but keep it separate from the \"Комментарий\" line.

Do NOT add any extra \"RU:\" line or full Russian translation of the whole reply. All visible text (кроме строки \"Комментарий:\") должно быть на английском.`
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
        userMessage = 'Слишком много запросов к ИИ. Подождите немного и попробуйте ещё раз.'
      } else {
        userMessage = 'Сейчас ИИ недоступен. Подождите немного и попробуйте ещё раз.';
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
        ? 'Слишком много запросов к ИИ. Подождите немного и начните новый диалог.'
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
