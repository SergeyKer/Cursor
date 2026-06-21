import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { extractJsonObject } from '@/lib/structuredLessonFactory'
import {
  areTipsTooSimilar,
  buildFallbackLessonExtraTips,
  isLikelyEmbeddedQuestionTopic,
  normalizeLessonExtraTips,
  type LessonExtraTips,
  type LessonTipsCefrLevel,
} from '@/lib/lessonExtraTips'
import { buildThirdBlockSystemLines, THIRD_BLOCK_JSON_SHAPE_EXAMPLES } from '@/lib/lessonExtraTipsThirdBlockPrompts'
import { catalogLevelToLevelId, type LessonCatalogLevel } from '@/lib/lessonCatalog'
import { buildCefrPromptBlock } from '@/lib/cefr/cefrSpec.server'
import { isValidLessonIntro } from '@/lib/lessonIntro'
import { normalizeTutorLearningIntent } from '@/lib/tutorLearningIntent'
import type { AiProvider, Audience, LevelId, OpenAiChatPreset } from '@/lib/types'
import type { LessonIntro } from '@/types/lesson'

type TipsMode = 'initial' | 'refresh'

type Body = {
  provider?: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  level?: LevelId
  lessonCefrLevel?: LessonCatalogLevel
  intro?: unknown
  intent?: unknown
  mode?: TipsMode
  previousItems?: unknown
  currentTips?: unknown
}

function normalizeLessonCefrLevel(value: unknown): LessonCatalogLevel | undefined {
  if (value === 'A1' || value === 'A2' || value === 'B1' || value === 'B2' || value === 'C1' || value === 'C2') {
    return value
  }
  return undefined
}

function resolveTipsLevelId(body: Body): LevelId {
  const lessonLevel = normalizeLessonCefrLevel(body.lessonCefrLevel)
  if (lessonLevel) return catalogLevelToLevelId(lessonLevel)
  if (body.level && body.level !== 'all') return body.level
  return 'a2'
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
  return value === 'refresh' || value === 'more' ? 'refresh' : 'initial'
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
  level: LevelId
  lessonCefrLevel?: LessonTipsCefrLevel
  mode: TipsMode
  previousItems: string[]
  currentTips: LessonExtraTips | null
}): string {
  const { intro, intent, audience, level, lessonCefrLevel, mode, previousItems, currentTips } = params
  return JSON.stringify(
    {
      task:
        mode === 'refresh'
          ? 'Generate a fresh full replacement for an existing short English lesson tips section.'
          : 'Generate a short extra tips section for an English lesson.',
      outputLanguage: 'ru',
      audience,
      level,
      lessonCefrLevel: lessonCefrLevel ?? null,
      mode,
      topic: intro.topic,
      tutorIntent: intent,
      lessonKind: intro.kind,
      complexity: intro.complexity,
      refreshGoal:
        mode === 'refresh'
          ? 'Return a noticeably different pedagogical angle for at least several cards, not a cosmetic rewrite of the current tips.'
          : null,
      knownIntro: {
        quick: intro.quick,
        details: intro.details ?? null,
        deepDive: intro.deepDive ?? null,
        learningPlan: intro.learningPlan ?? null,
      },
      previousItems,
      currentTips:
        mode === 'refresh' && currentTips
          ? {
              topic: currentTips.topic,
              cards: currentTips.cards.map((card) => ({
                category: card.category,
                title: card.title,
                rule: card.rule,
                examples: card.examples.slice(0, 2),
              })),
            }
          : null,
      requiredJsonShape: {
        cards: [
          {
            category: 'native_speech',
            title: 'Как говорят носители',
            rule:
              '2 short Russian lines for the "Логика носителя" block: explain one reason natives say it this way for this exact topic',
            examples: [
              {
                wrong:
                  'EXACTLY ONE short English sentence (max ~12 words): textbook/longer OR typical learner mistake; for be use I am not I\'m; never " · " chains; never embed topic as subject',
                right:
                  'EXACTLY ONE short English sentence (max ~12 words): same meaning, more natural/spoken; for be use I\'m; never " · " or multiple sentences',
                note:
                  'one friendly Russian sentence: what form changes (contractions, -s after Who, chunking) - not meta "how the topic works"',
              },
              THIRD_BLOCK_JSON_SHAPE_EXAMPLES.native_speech,
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
              THIRD_BLOCK_JSON_SHAPE_EXAMPLES.russian_traps,
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
              THIRD_BLOCK_JSON_SHAPE_EXAMPLES.questions_negatives,
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
              THIRD_BLOCK_JSON_SHAPE_EXAMPLES.emphasis_emotion,
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
              THIRD_BLOCK_JSON_SHAPE_EXAMPLES.context_culture,
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
  const lessonCefrLevel = normalizeLessonCefrLevel(body.lessonCefrLevel)
  const tipsLevelId = resolveTipsLevelId(body)
  const cefrBlock = buildCefrPromptBlock({ level: tipsLevelId, audience, mode: 'dialogue' })
  const embeddedTopic = isLikelyEmbeddedQuestionTopic(intro)

  const system = [
    cefrBlock,
    `Уровень урока в меню: ${lessonCefrLevel ?? tipsLevelId.toUpperCase()}. Все примеры строго по topic урока; лексика и длина предложений не выше этого уровня.`,
    'Ты методист английского для MyEng.',
    'Пиши как профессор лингвистики, который объясняет простыми словами: практично, точно и интересно, без длинной теории.',
    'Для native_speech пиши как UX-копирайтер для карточки "Как говорят носители": коротко, дружески, живо, 0% академизма.',
    'native_speech всегда привязывай к topic: не подставляй универсальные wanna/gonna/lemme, если тема не про них.',
    'Если передан tutorIntent, обязательно используй его targetPatterns, examples, mustTrain и mustAvoid. Не уходи в общие учебные фразы.',
    'В native_speech rule = "Логика носителя": один главный принцип мышления носителя, 1-2 короткие строки по-русски.',
    'Алгоритм для native_speech examples[0] "Живая подмена": выбери РОВНО одну ветку на урок; смотри topic, lessonKind, tutorIntent и knownIntro (quick, details, deepDive, learningPlan).',
    'Ветка 0 (приоритет): если в knownIntro.learningPlan есть contrastPair - wrong и right ОБЯЗАНЫ быть одной мыслью (например I am happy. / I\'m happy.), не «настроение vs страна». В wrong - полная форма без сокращений I\'m; во right - сокращение той же фразы. Если contrastPair про разные смыслы - не копируй: возьми пару из quick.how (I\'m happy. / I am happy.) или I am happy. / I\'m happy.',
    'Ветка 1 "сокращения be/aux": только если topic про to be / am is are - ровно ОДНА пара: wrong полная форма (I am happy.), right сокращение (I\'m happy.); без " · " и без русского в wrong/right; note: сокращения норма, полная форма в быту звучит книжно.',
    'Ветка 2 "длиннее vs короче" (лексика, чанки): ровно ОДНА пара предложений, только английский, без вставки строки topic внутрь фраз.',
    'Ветка 3 "форма вопроса/ответа" (Who questions): ровно ОДНА пара - типичная ошибка ученика (Who like music?) vs правильная форма (Who likes music?); это НЕ «учебник длиннее», а ошибка кальки; UI покажет «Типичная ошибка» / «Так говорят».',
    'Ветка 4 "встроенные вопросы" (embedded): если topic про встроенный вопрос или в commonMistakes есть what does she / where is the station - wrong = ошибка порядка (I know what does she like.) vs right = правильный порядок (I know what she likes.); UI покажет «Типичная ошибка» / «Так говорят»; это НЕ Who -s и НЕ длиннее/короче.',
    embeddedTopic
      ? 'Для ЭТОГО урока выбери ветку 4 (встроенные вопросы), не ветку 3 (Who) и не ветку 2 (generic length).'
      : 'Ориентир: встроенные вопросы → ветка 4; Wh-question Who → ветка 3; be/contractions → ветка 1; иначе ветка 2.',
    'ЗАПРЕЩЕНО в examples[0]: "Do you know how…", "It is important that I get…", "How does [topic] work when you speak", "I need to nail [topic] today", вставка названия topic как подлежащего.',
    'Для всех веток native_speech examples[0]: wrong и right - ОДНА И ТА ЖЕ мысль; меняется только форма (полная vs сокращённая) или одна типичная ошибка vs исправление (только Wh). ЗАПРЕЩЕНО: commonMistakes в native_speech для be/I am (только карточка ловушек); грамматически неверный wrong как «полная форма» (from in, I am student без a); смешивать I am from… и I\'m happy.',
    'Для всех веток native_speech examples[0]: wrong длиннее/учебниковее или ошибка ученика, right короче/живее или исправление, один смысл. Не ставь I\'m в wrong, если right - та же мысль с I\'m.',
    'Если ветка не (1), не форсируй I am / I\'m только ради примера; если ветка (1), не подменяй смысл другими конструкциями. wrong не заполняй русской фразой вместо английского «как в школе».',
    'Для native_speech помни: в разговоре носители чаще берут короткую готовую форму, если это правда для topic (сокращения, порядок слов, готовый шаблон).',
    ...buildThirdBlockSystemLines(),
    'Для russian_traps пиши как методист для русскоговорящих: поддерживающе, чётко, без академизма и стыда за ошибку.',
    'russian_traps всегда привязывай к topic и показывай именно русскую кальку. Если явной кальки нет, объясни близкую привычку русского мышления для этой темы.',
    'В russian_traps rule = "Как переключить мышление": одна простая установка, как думать по-английски, чтобы ошибка исчезла.',
    'В russian_traps examples[0] = "Классическая калька": wrong = типичная ошибка из прямого перевода, right = правильный английский, note = почему мозг подставляет русский шаблон.',
    'Для questions_negatives пиши карточку "Где ошибаются": дружелюбно, без упрёков и без академичных терминов.',
    'В questions_negatives examples[0] = "Типичный промах": wrong начинай с "✗", right с "✓", note = коротко в чём суть ошибки (5-7 слов).',
    'В questions_negatives rule = "Почему так выходит": одна простая причина ошибки человеческим языком.',
    'Для emphasis_emotion пиши карточку "Сделай речь ярче": энергично, мотивирующе и без учебникового тона.',
    'В emphasis_emotion title = "Сделай речь ярче", rule = короткое объяснение когда усилитель звучит естественно в теме.',
    'В emphasis_emotion examples[0] = 2-3 конкретных усилителя и фраза с ними; note = короткий перевод или контекст.',
    'В emphasis_emotion examples[2], если нужен, = дополнительный живой пример с усилителем.',
    'Для context_culture пиши карточку "Контекст и стиль": практично, жизненно и без академизма.',
    'В context_culture примеры должны быть строго разделены по строкам: английский в examples, русский только в note.',
    'В context_culture rule = "Культурный нюанс": одна деталь про стиль, прямоту, вежливость или выбор тона.',
    'В context_culture examples[0] = пара "чат и работа" с неформальным и официальным вариантом.',
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
    'Во всех ветках native_speech examples[0]: wrong и right - только английский, ровно одно предложение, без " · " и без русского внутри фраз.',
    'Не повторяй previousItems.',
    'Если mode=refresh, перепиши набор как новый полезный ракурс по той же теме, а не как косметический рерайт.',
    'Если mode=refresh, для минимум 2-3 карточек смени педагогический угол: другой типичный промах, другой контекст, другой триггер проверки, другой стиль ситуации или другой способ объяснить шаблон.',
    'Если mode=refresh, избегай почти тех же первых примеров и почти тех же rules, что уже были в currentTips.',
  ].join('\n')

  const intent = normalizeTutorLearningIntent(body.intent)
  const fallback = buildFallbackLessonExtraTips(intro, intent, lessonCefrLevel)
  const currentTips = body.currentTips
    ? normalizeLessonExtraTips(body.currentTips, intro, intent, lessonCefrLevel)
    : null
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
          level: tipsLevelId,
          lessonCefrLevel,
          mode,
          previousItems,
          currentTips,
        }),
      },
    ],
    maxTokens: mode === 'refresh' ? 1300 : 1300,
    openAiChatPreset,
    traceLabel: 'lesson-extra-tips',
  })

  if (!model.ok) {
    return NextResponse.json({ tips: fallback, generated: false, fallback: true }, { status: 200 })
  }

  try {
    const parsed = JSON.parse(extractJsonObject(model.content))
    const tips = normalizeLessonExtraTips(parsed, intro, intent, lessonCefrLevel)
    if (mode === 'refresh' && currentTips && areTipsTooSimilar(currentTips, tips)) {
      return NextResponse.json({ tips, generated: false, fallback: false, tooSimilar: true }, { status: 200 })
    }
    return NextResponse.json({ tips, generated: true, fallback: false })
  } catch {
    return NextResponse.json({ tips: fallback, generated: false, fallback: true }, { status: 200 })
  }
}
