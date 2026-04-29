import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { extractJsonObject } from '@/lib/structuredLessonFactory'
import { buildFallbackLessonExtraTips, normalizeLessonExtraTips } from '@/lib/lessonExtraTips'
import { isValidLessonIntro } from '@/lib/lessonIntro'
import { normalizeTutorLearningIntent } from '@/lib/tutorLearningIntent'
import type { AiProvider, Audience, LevelId, OpenAiChatPreset } from '@/lib/types'
import type { LessonIntro } from '@/types/lesson'

type TipsMode = 'initial' | 'more'

type Body = {
  provider?: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  level?: LevelId
  intro?: unknown
  intent?: unknown
  mode?: TipsMode
  previousItems?: unknown
}

function normalizeProvider(value: unknown): AiProvider {
  return value === 'openrouter' ? 'openrouter' : 'openai'
}

function normalizeOpenAiChatPreset(value: unknown): OpenAiChatPreset {
  if (value === 'gpt-5.4-mini-none') return 'gpt-5.4-mini-none'
  if (value === 'gpt-5.4-mini-low') return 'gpt-5.4-mini-low'
  return 'gpt-4o-mini'
}

function normalizeAudience(value: unknown): Audience {
  return value === 'child' ? 'child' : 'adult'
}

function normalizeMode(value: unknown): TipsMode {
  return value === 'more' ? 'more' : 'initial'
}

function normalizePreviousItems(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(-30)
}

function buildPrompt(params: {
  intro: LessonIntro
  intent?: ReturnType<typeof normalizeTutorLearningIntent>
  audience: Audience
  level: LevelId | undefined
  mode: TipsMode
  previousItems: string[]
}): string {
  const { intro, intent, audience, level, mode, previousItems } = params
  return JSON.stringify(
    {
      task:
        mode === 'more'
          ? 'Generate fresh extra examples for an existing short English lesson tips section.'
          : 'Generate a short extra tips section for an English lesson.',
      outputLanguage: 'ru',
      audience,
      level: level ?? 'all',
      mode,
      topic: intro.topic,
      tutorIntent: intent,
      lessonKind: intro.kind,
      complexity: intro.complexity,
      knownIntro: {
        quick: intro.quick,
        details: intro.details ?? null,
        deepDive: intro.deepDive ?? null,
        learningPlan: intro.learningPlan ?? null,
      },
      previousItems,
      requiredJsonShape: {
        cards: [
          {
            category: 'native_speech',
            title: 'Как говорят носители',
            rule:
              '2 short Russian lines for the "Логика носителя" block: explain one reason natives say it this way for this exact topic',
            examples: [
              {
                wrong: 'school/long English phrase for this topic, or a Russian-style phrase if contrast is clearer',
                right: 'shorter natural English phrase natives would use for this topic',
                note:
                  'short Russian translation or nuance for the live substitution',
              },
              {
                wrong: 'optional phrase before applying the quick trick',
                right: 'English phrase after applying the quick trick',
                note: 'one quick practical move in Russian: replacement, contraction, word order, or context trick; no theory',
              },
            ],
          },
          {
            category: 'russian_traps',
            title: 'Ловушки для русскоговорящих',
            rule:
              '2 short Russian lines for the "Как переключить мышление" block: one mental switch that breaks the Russian calque habit for this topic',
            examples: [
              {
                wrong: 'typical wrong English phrase caused by direct Russian translation for this topic',
                right: 'correct natural English phrase for this topic',
                note: 'short Russian explanation of why the brain reaches for the Russian template',
              },
              {
                wrong: 'short mixed Russian-English phrase to choose the correct English option for, e.g. "It is time to читать."',
                right: 'correct phrase after the 3-second check',
                note: 'short Russian reason why the correct option is correct and the distractor is wrong; no theory',
              },
            ],
          },
          {
            category: 'questions_negatives',
            title: 'Где ошибаются',
            rule: '2 short Russian lines for the "Почему так выходит" block: one simple reason the brain makes this mistake',
            examples: [
              {
                wrong: '✗ wrong English phrase with a common learner mistake for this topic',
                right: '✓ correct English phrase for the same meaning',
                note: 'very short Russian reason of the mistake, around 5-7 words',
              },
              {
                wrong: 'optional short self-check question in Russian',
                right: 'correct English checkpoint phrase',
                note: 'one practical 5-second fix in Russian: mnemonic, quick check, or replacement',
              },
            ],
          },
          {
            category: 'emphasis_emotion',
            title: 'Сделай речь ярче',
            rule: '2 short Russian lines for the "Живые примеры" block: explain when the усилитель sounds natural in this topic',
            examples: [
              {
                wrong: 'neutral base phrase for this topic',
                right: 'natural phrase with an emphasis booster for this topic',
                note: 'short Russian note about the effect of the booster in context',
              },
              {
                wrong: 'another natural conversation line with a booster',
                right: 'same line in a slightly more expressive version',
                note: 'short Russian context note: when this booster sounds natural',
              },
            ],
          },
          {
            category: 'context_culture',
            title: 'Контекст и стиль',
            rule: '2 short Russian lines for the "Культурный нюанс" block: one practical detail about style choice for this topic',
            examples: [
              {
                wrong: 'informal English line for chat or friends',
                right: 'formal English line for email or work',
                note: 'short Russian translation for both tones, separated by situation',
              },
              {
                wrong: 'a second style-choice example in English',
                right: 'the better option for a different situation',
                note: 'short Russian rule: choose style by who you speak to',
              },
            ],
          },
        ],
        quiz: [
          {
            id: 'short-id',
            question: 'short Russian question',
            options: ['2-3 options'],
            correctAnswer: 'exactly one of options',
            explanation: 'one short Russian explanation',
          },
        ],
      },
    },
    null,
    2
  )
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  if (!isValidLessonIntro(body.intro)) {
    return NextResponse.json({ error: 'Некорректное intro урока.' }, { status: 400 })
  }

  const intro = body.intro
  const provider = normalizeProvider(body.provider)
  const openAiChatPreset = normalizeOpenAiChatPreset(body.openAiChatPreset)
  const audience = normalizeAudience(body.audience)
  const mode = normalizeMode(body.mode)
  const previousItems = normalizePreviousItems(body.previousItems)

  const system = [
    'Ты методист английского для MyEng.',
    'Пиши как профессор лингвистики, который объясняет простыми словами: практично, точно и интересно, без длинной теории.',
    'Для native_speech пиши как UX-копирайтер для карточки "Как говорят носители": коротко, дружески, живо, 0% академизма.',
    'native_speech всегда привязывай к topic: не подставляй универсальные wanna/gonna/lemme, если тема не про них.',
    'Если передан tutorIntent, обязательно используй его targetPatterns, examples, mustTrain и mustAvoid. Не уходи в общие учебные фразы.',
    'В native_speech rule = "Логика носителя": один главный принцип мышления носителя, 1-2 короткие строки по-русски.',
    'В native_speech examples[0] = "Живая подмена": wrong = школьная/длинная форма, right = живой вариант, note = короткий перевод или нюанс.',
    'В native_speech examples[1] = "Быстрый приём": note = конкретный лайфхак, который можно применить сразу; без теории.',
    'Для native_speech делай акцент, что носители часто выбирают более короткий, готовый или контекстный вариант, только если это правда для topic.',
    'Для russian_traps пиши как методист для русскоговорящих: поддерживающе, чётко, без академизма и стыда за ошибку.',
    'russian_traps всегда привязывай к topic и показывай именно русскую кальку. Если явной кальки нет, объясни близкую привычку русского мышления для этой темы.',
    'В russian_traps rule = "Как переключить мышление": одна простая установка, как думать по-английски, чтобы ошибка исчезла.',
    'В russian_traps examples[0] = "Классическая калька": wrong = типичная ошибка из прямого перевода, right = правильный английский, note = почему мозг подставляет русский шаблон.',
    'В russian_traps examples[1] = "Проверка за 3 секунды": wrong = короткая фраза-задание со смешением русского и английского, например "It is time to читать.", right = правильный английский вариант, note = короткое объяснение для фидбека "потому что ...".',
    'Для questions_negatives пиши карточку "Где ошибаются": дружелюбно, без упрёков и без академичных терминов.',
    'В questions_negatives examples[0] = "Типичный промах": wrong начинай с "✗", right с "✓", note = коротко в чём суть ошибки (5-7 слов).',
    'В questions_negatives rule = "Почему так выходит": одна простая причина ошибки человеческим языком.',
    'В questions_negatives examples[1] = "Фикс за 5 секунд": note = один конкретный практический приём, right = короткий правильный шаблон.',
    'Для emphasis_emotion пиши карточку "Сделай речь ярче": энергично, мотивирующе и без учебникового тона.',
    'В emphasis_emotion title = "Сделай речь ярче", rule = короткое объяснение когда усилитель звучит естественно в теме.',
    'В emphasis_emotion examples[0] = 2-3 конкретных усилителя и фраза с ними; note = короткий перевод или контекст.',
    'В emphasis_emotion examples[1] = 2-3 живые фразы с усилителями и context note; examples[2], если нужен, = быстрый практический совет.',
    'Для context_culture пиши карточку "Контекст и стиль": практично, жизненно и без академизма.',
    'В context_culture примеры должны быть строго разделены по строкам: английский в examples, русский только в note.',
    'В context_culture rule = "Культурный нюанс": одна деталь про стиль, прямоту, вежливость или выбор тона.',
    'В context_culture examples[0] = пара "чат и работа" с неформальным и официальным вариантом.',
    'В context_culture examples[1] = "Правило выбора": если... / если..., чтобы понять, что сказать в ситуации.',
    'В note показывай настоящий языковой нюанс: порядок слов, количество смысловых частей, зависимость между словами, тип конструкции или то, почему английский требует отдельную форму.',
    'Особенно ищи контраст "по-русски можно одним словом/коротко, а по-английски нужна конструкция".',
    'Не называй note общей "разницей"; объясняй, что именно меняется в построении предложения.',
    'Верни только JSON без markdown.',
    'Всегда верни ровно 5 cards в категориях: native_speech, russian_traps, questions_negatives, emphasis_emotion, context_culture.',
    'В каждой card: category, title, rule, examples. В examples 2-3 объекта: {wrong, right, note}. wrong можно оставить пустым, если ошибки нет.',
    'Для лексики questions_negatives трактуй как "как использовать слово/фразу в вопросе, отрицании или коротком шаблоне".',
    'Не выдумывай UK/US различия. Если реального отличия нет, пиши про формальность, регистр или ситуацию.',
    'Не форсируй сленг, если он звучит неестественно.',
    'quiz: ровно 2 коротких вопроса, options 2-3, correctAnswer обязан совпадать с одним option.',
    'Пиши объяснения по-русски, английский оставляй только в примерах.',
    'Не повторяй previousItems.',
  ].join('\n')

  const intent = normalizeTutorLearningIntent(body.intent)
  const fallback = buildFallbackLessonExtraTips(intro, intent)
  const model = await callProviderChat({
    provider,
    req,
    apiMessages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: buildPrompt({
          intro,
          intent,
          audience,
          level: body.level,
          mode,
          previousItems,
        }),
      },
    ],
    maxTokens: mode === 'more' ? 900 : 1300,
    openAiChatPreset,
    traceLabel: 'lesson-extra-tips',
  })

  if (!model.ok) {
    return NextResponse.json({ tips: fallback, generated: false, fallback: true }, { status: 200 })
  }

  try {
    const parsed = JSON.parse(extractJsonObject(model.content))
    const tips = normalizeLessonExtraTips(parsed, intro, intent)
    return NextResponse.json({ tips, generated: true, fallback: false })
  } catch {
    return NextResponse.json({ tips: fallback, generated: false, fallback: true }, { status: 200 })
  }
}
