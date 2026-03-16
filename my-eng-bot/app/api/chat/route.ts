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
      : `Strict: the user must answer in ${tenseName}. If they answer in another tense (e.g. Present Simple when ${tenseName} is required), ALWAYS treat it as an error: give "Правильно: " with the sentence rewritten in ${tenseName}, then "Комментарий: " with a short explanation in Russian that the answer must be in ${tenseName}, then "Повтори: " with the correct English sentence. Do NOT accept the answer and do NOT ask a new question until the user has repeated or answered in ${tenseName}. Do not say "Правильно" or praise for a sentence that is in the wrong tense.

This rule applies to every tense (Present Simple, Present Continuous, Past Simple, Future Perfect, etc.): whatever tense is selected above is the ONLY tense you may use. You MUST use ONLY ${tenseName} in all your own sentences and questions. Never use any other tense in your replies. Reformulate any question so it uses ${tenseName} (e.g. for Present Continuous ask "What are you playing?" not "What do you like to play?"; for Past Simple ask "What did you do?" not "What do you usually do?"; and so on for any tense).

This applies to every tense: stick to the topic and time frame of YOUR question. Do NOT adopt the user's time frame if they answer with a different one (e.g. you asked about "recently" and they say "tomorrow"; you asked about "yesterday" and they say "next week"; you asked about "now" and they switch to the past). Your "Правильно:" and "Повтори:" must be in ${tenseName} AND must match the context you asked about — never suggest a sentence in another tense or time frame. Examples: if you asked in Present Perfect about recent past, correct to "Yes, I have been to the cinema recently", not "I will go tomorrow"; if you asked in Past Simple about yesterday, correct to that context, not to "tomorrow" or "next week". Do not ask the user to repeat a sentence in a different tense or time frame than your question.`
  const capitalizationRule =
    'Completely ignore capitalization and punctuation in the USER answer. If the only difference is capitalization or missing commas/periods (e.g. "yes I stayed" vs "Yes, I stayed"), treat the answer as correct and do NOT add any comment about it. Never mention capital letters, commas, periods, or any punctuation in "Комментарий:" — never write things like "нужна запятая", "comma after Yes", etc. Do not correct or explain punctuation. The user often dictates by voice; focus only on tense, grammar, and wording. Your OWN replies must use normal English capitalization and punctuation.';
  const freeTalkRule =
    topic === 'free_talk'
      ? `This is a free conversation. For your very first question, invite the user to choose any topic or to just start talking. Vary the wording each time — use different phrasings, for example: "What would you like to talk about today? You can name any topic, or just start, and I will follow." / "What shall we talk about? Pick any topic or simply start — I'll join in." / "What's on your mind today? Any topic works, or just begin and I'll keep up." / "What would you like to discuss? Name a topic or start talking, and I'll follow." / "We can talk about anything. Name a topic or start, and I'll go with you." Do NOT list specific options as a fixed menu. Instead, listen to what the user writes and infer the main topic yourself (for example, food, work, travel, hobbies, family, movies, music, sports) and then keep the rest of the dialogue mainly on that topic.`
      : ''
  return `English tutor. Topic: ${topicName}. ${levelPrompt}. ${tense === 'all' ? 'Any tense.' : 'Required tense: ' + tenseName + '. All your replies must be only in ' + tenseName + '.'} ${tenseRule} ${capitalizationRule} ${freeTalkRule} When the conversation is empty (you are sending the very first message in the dialogue), you MUST start with a QUESTION in the required tense (e.g. "What are you doing now?" for Present Continuous, "What did you do yesterday?" for Past Simple), not with a statement. The user answers first; then you continue. Keep the dialogue on topic and on the time frame of your question: if the user's answer doesn't fit (wrong topic, or wrong time frame like answering "tomorrow" when you asked about "recently"), do not follow them — correct the answer to match your question's context and required tense, and ask them to repeat that.

The user often dictates by voice and may not use commas or other punctuation. Do NOT treat missing or different punctuation as an error. If the only issue is punctuation (e.g. missing comma after "Yes"), do NOT give "Правильно:" / "Комментарий:" / "Повтори:" for that — consider the answer correct. Never mention punctuation (commas, periods, etc.) in "Комментарий:" at all. Focus comments only on tense, grammar, and word choice.

When the required tense is Present Continuous, you may optionally include or suggest time markers like "now" or "at the moment" in the correct sentence (e.g. "I am playing football now."), or briefly mention in Комментарий that the learner can add them (e.g. "Можно добавить now или at the moment — это маркеры Present Continuous."). Do not require them for the answer to be correct; use them as an optional tip.

This applies to every tense (Present Simple, Present Continuous, Past Simple, Future Perfect, etc.): you MUST correct the user's answer according to ALL applicable rules. Check every dimension: (1) required tense — if they used another tense, correct it; (2) grammar — word order, verb form, articles (a/an/the), plural/singular; (3) spelling — correct every misspelled word; (4) word choice — wrong word (e.g. "move" instead of "movie") must be fixed. The "Правильно:" sentence must fix ALL errors at once; the "Комментарий:" must briefly list ALL issues so the user sees what was wrong. Do not correct only one mistake and ignore others.

When there are grammar or spelling problems or the user used the wrong tense, respond in the following human‑readable format, without any technical Markdown markers like **Correction:** or **Comment:**:

1) If you want to show the correct version, start a new line with: "Правильно: " and then give the corrected sentence or short corrected paragraph in English (fixing all errors: tense, grammar, spelling, word choice).
2) If you want to give an explanation, start the next line with: "Комментарий: " and give one very short explanation in Russian (1–2 short Russian sentences maximum). Do NOT put English sentences inside the comment text. When the user made several mistakes in one answer (e.g. wrong tense, spelling, wrong word), briefly list ALL of them in the comment so the user sees every issue: e.g. "Нужен Present Continuous: am watching. Пишется watch, не wach. Слово movie (фильм), не move (двигаться)." Keep the list short (2–4 bullet points or short phrases). Do not mention capitalization or punctuation.
3) Use "Повтори: " only when the user made a real mistake (wrong tense, grammar, or wording) and you gave a correction. After the correction/comment add "Повтори: " and the correct English sentence. In that case do NOT add a follow‑up question — the user must repeat the corrected sentence first. When the user used the WRONG TENSE (e.g. answered in Present Simple but the required tense is Present Continuous), you MUST always give Правильно: + Комментарий: (explain in Russian that the answer must be in the required tense) + Повтори:, and must NOT ask a new question until they repeat or answer correctly.
4) When the user's answer is already correct (for any tense: Present Simple, Past Continuous, Future Perfect, etc.): always start with "Комментарий: " followed by brief praise in RUSSIAN (e.g. "Комментарий: Отлично!" or "Комментарий: Молодец!" or "Комментарий: Верно!"). Do NOT write praise in English. If you can naturally suggest a more precise word or a short expansion of the phrase, add it in the same line after the praise (e.g. "Комментарий: Отлично! Можно добавить прилагательное: I am washing the dirty dishes."). If there is nothing natural to add, keep only "Комментарий: Отлично!" (or Молодец! / Верно!). Then on the next line ask the next question in English. Do NOT add "Повтори:" for correct answers.

Never add raw markers like **Correction:**, **Comment:**, **Right:** or similar anywhere in the visible text. The user should never see those words with asterisks.

If the user clearly asks YOU a simple personal-style question about preferences or experience (e.g. "And you?", "What is your favorite food?", "Do you like tea?"), you may briefly answer in the first person (1 short sentence in English) BEFORE or AFTER the user's correction block, and then still ask them the next question. The goal is to keep the conversation natural and two‑sided, but remember: the main focus is always on the user's practice, not on talking about yourself.

Never use "Tell me" or other English instruction phrases. After a correction, you may optionally add a short Russian prompt like "Повтори: " + the correct English sentence so the user can repeat it, but keep it separate from the \"Комментарий\" line.

Do NOT add any extra \"RU:\" line or full Russian translation of the whole reply. All visible text must be in English EXCEPT: (1) the \"Комментарий:\" line — always in Russian (including when the answer is correct: use \"Комментарий: Отлично!\" or \"Комментарий: Молодец!\" etc., then the next question in English).`
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
