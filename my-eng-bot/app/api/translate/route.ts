import { NextRequest, NextResponse } from 'next/server'
import type { AppMode, TenseId } from '@/lib/types'
import { buildProxyFetchExtra } from '@/lib/proxyFetch'
import { classifyOpenAiForbidden } from '@/lib/openAiForbidden'
import { applyTranslationQualityGate, normalizeTranslationResult } from '@/lib/translationPostProcess'

export const runtime = 'nodejs'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

type Provider = 'openrouter' | 'openai'

const VALID_TENSE_IDS = new Set<string>([
  'all',
  'present_simple',
  'present_continuous',
  'present_perfect',
  'present_perfect_continuous',
  'past_simple',
  'past_continuous',
  'past_perfect',
  'past_perfect_continuous',
  'future_simple',
  'future_continuous',
  'future_perfect',
  'future_perfect_continuous',
])

function parseOptionalTenses(raw: unknown): TenseId[] | null {
  if (!Array.isArray(raw)) return null
  const out: TenseId[] = []
  for (const x of raw) {
    if (typeof x === 'string' && VALID_TENSE_IDS.has(x)) out.push(x as TenseId)
  }
  return out.length ? out : null
}

function parseOptionalMode(raw: unknown): AppMode | null {
  if (raw === 'dialogue' || raw === 'translation' || raw === 'communication') return raw
  return null
}

type TranslateDirection = 'en_to_ru' | 'ru_to_en'

function parseDirection(raw: unknown): TranslateDirection {
  if (raw === 'ru_to_en') return 'ru_to_en'
  return 'en_to_ru'
}

function buildLearnerContextSuffix(tenses: TenseId[] | null, mode: AppMode | null): string {
  let s = ''
  if (tenses?.length) {
    const specific = tenses.filter((t) => t !== 'all')
    if (specific.length > 0) {
      s +=
        ` Learner focus English tense categories (align Russian aspect/tense choices with these when translating): ${specific.join(', ')}.`
    }
  }
  if (mode && mode !== 'translation') {
    s += ' This text is from an English practice chat; keep pedagogical clarity in Russian.'
  }
  return s
}

/** Контекст для RU→EN: подсказки по временам уже в сторону английского вывода. */
function buildLearnerContextSuffixRuToEn(tenses: TenseId[] | null, mode: AppMode | null): string {
  let s = ''
  if (tenses?.length) {
    const specific = tenses.filter((t) => t !== 'all')
    if (specific.length > 0) {
      s += ` Align English verb forms and time reference with these learner focus categories: ${specific.join(', ')}.`
    }
  }
  if (mode && mode !== 'translation') {
    s += ' Source is learner Russian from practice chat; output natural English.'
  }
  return s
}

function buildSystemPromptEnToRu(params: {
  audience: 'child' | 'adult'
  learnerContext: string
}): string {
  const { audience, learnerContext } = params
  const form =
    audience === 'child'
      ? 'Use informal address only (ты, тебе, твой). Never use formal address (вы, вам, ваш). Keep every Russian sentence in natural second-person singular grammar: ты пошёл, ты спросил, у тебя есть.'
      : 'Use polite address (вы).'
  const favoriteFoodExample =
    audience === 'child'
      ? 'For questions like "What is your favorite food?" use idiomatic patterns such as "Какая у тебя любимая еда?" instead of awkward phrases like "Что такое ваша любимая еда?".'
      : 'For questions like "What is your favorite food?" use idiomatic patterns such as "Какая у вас любимая еда?" instead of awkward phrases like "Что такое ваша любимая еда?".'
  const tenseGrammarRules =
    'Russian grammar for tense mapping: Never combine the future auxiliary буду/будешь/будем/будете/будут with past-tense verb forms (e.g. "буду прыгал" is ungrammatical). ' +
    'Use imperfective infinitives with composite future when needed (e.g. буду прыгать), or rephrase with natural Russian for duration and completion (к моменту … уже …, успею, продолжу …). ' +
    'English Present/Past/Future Perfect and Perfect Continuous do not translate word-for-word; choose idiomatic Russian that matches time and aspect, not a calque. '
  return (
    'You are a professional English-to-Russian translator. Translate naturally, adapting idioms and collocations to standard Russian usage. Preserve tone, register, and context. Never translate literally if it sounds unnatural. ' +
    tenseGrammarRules +
    form +
    ' Keep correct Russian grammar, case, and verb government. For hobby/interest meaning (hobby, be into, be interested in, pursue), use natural patterns with correct government: "увлекаться чем", "интересоваться чем", "заниматься чем". Never produce ungrammatical forms like "Какое хобби вы недавно увлекались?". ' +
    ' Avoid bureaucratic or robotic phrases like "связанное с", "в отношении", "касаемо", "по части". If the English is a question, translate it as a clear question a real person would ask. ' +
    'Prefer idiomatic Russian over literal structure. For example, translate "What do you usually do about culture?" as a natural question like "Что ты обычно делаешь, когда речь заходит о культуре?" rather than "Как ты обычно занимаешься культурой?". ' +
    favoriteFoodExample + ' ' +
    'For English questions with "what ... in" (e.g. "What are you swimming in?") keep the preposition in Russian: use "В чём ...?" — never "Что ты плаваешь?" which loses the meaning. ' +
    'Important: in conversational prompts like "Just start, and I will follow." translate "I will follow" idiomatically as "я подхвачу/я продолжу/я поддержу разговор" depending on context. ' +
    'If the English source is ungrammatical, jumbled, or looks like a broken mix of words, infer the learner\'s intent and produce idiomatic Russian — do not mirror the broken English word order. ' +
    'The output must be entirely in Russian (Cyrillic). Do not leave English verbs or fragments such as inspires, inspiring, try as bare English inside the Russian text — translate them or rephrase. ' +
    'Proper names and unavoidable loanwords are acceptable only when standard in Russian. ' +
    learnerContext +
    'Reply only with the translation, without explanations, quotes, or extra words.'
  )
}

function buildSystemPromptRuToEn(params: {
  audience: 'child' | 'adult'
  learnerContext: string
}): string {
  const { audience, learnerContext } = params
  const register =
    audience === 'child'
      ? 'When the Russian uses informal ты, use natural informal English (you); when formal вы is clearly implied, use polite natural English.'
      : 'Match register: informal Russian → natural informal English; formal or polite Russian → polite English.'
  return (
    'You are a professional translator from Russian to English. Translate into natural conversational English. Preserve meaning, tone, and intent. Avoid word-for-word calques when they would sound wrong in English. ' +
    'Love vs like: do not automatically translate Russian "любить" as love. Use love when the context clearly expresses strong attachment or deep emotion; for ordinary preference, habit, or mild liking, use like, enjoy, or be fond of. Let the emotional intensity in the source guide the choice. ' +
    'Would like vs would love: "would like" is polite wanting (I would like to…); "I would love to" is stronger than "I would like to" for enthusiasm. ' +
    register + ' ' +
    learnerContext +
    'Reply only with the English translation, without explanations, quotes, or extra words.'
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const provider: Provider = body.provider === 'openai' ? 'openai' : 'openrouter'
    const audience: 'child' | 'adult' = body.audience === 'child' ? 'child' : 'adult'
    const direction = parseDirection(body.direction)
    const optionalTenses = parseOptionalTenses(body.tenses)
    const optionalMode = parseOptionalMode(body.mode)
    const learnerContextEnToRu = buildLearnerContextSuffix(optionalTenses, optionalMode)
    const learnerContextRuToEn = buildLearnerContextSuffixRuToEn(optionalTenses, optionalMode)
    if (!text) {
      return NextResponse.json({ error: 'Текст для перевода не передан' }, { status: 400 })
    }

    const system =
      direction === 'ru_to_en'
        ? buildSystemPromptRuToEn({ audience, learnerContext: learnerContextRuToEn })
        : buildSystemPromptEnToRu({ audience, learnerContext: learnerContextEnToRu })
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
        const proxyFetchExtra = await buildProxyFetchExtra()
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
          ...(proxyFetchExtra as RequestInit),
        } as RequestInit)
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
    const raw = (first?.message?.content ?? first?.text ?? '').trim()
    const content =
      direction === 'en_to_ru'
        ? applyTranslationQualityGate(normalizeTranslationResult(raw))
        : raw.replace(/\s+/g, ' ').trim()

    if (!content) {
      return NextResponse.json(
        { error: 'Модель вернула пустой перевод.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ content, direction })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка при переводе' },
      { status: 500 }
    )
  }
}
