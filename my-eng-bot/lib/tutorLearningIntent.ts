import type { LessonIntro, LessonIntroKind } from '@/types/lesson'

export type TutorTopicType = 'grammar' | 'vocabulary' | 'contrast' | 'phrase_patterns' | 'concept'
export type TutorIntentType =
  | 'single_rule'
  | 'contrast'
  | 'phrase_pattern'
  | 'form_practice'
  | 'mistake_clinic'
  | 'short_examples'
  | 'free_explanation'

export type TutorLearningIntentExample = {
  en: string
  ru: string
  noteRu: string
}

export type TutorLearningIntent = {
  id: string
  canonicalKey: string
  title: string
  intentType: TutorIntentType
  learnerQuestionRu: string
  topicType: TutorTopicType
  coreQuestion: string
  contrastPair?: [string, string]
  meaningFocus?: string
  goalRu: string
  targetPatterns: string[]
  examples: TutorLearningIntentExample[]
  commonMistakes: string[]
  mustTrain: string[]
  mustAvoid: string[]
  firstPracticeGoalRu: string
}

const MAX_LIST_ITEMS = 6
const MAX_EXAMPLES = 6

function compactText(value: unknown, maxLength = 180): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength).trim()
}

function compactList(value: unknown, maxItems = MAX_LIST_ITEMS): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => compactText(item)).filter(Boolean).slice(0, maxItems)
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-zа-яё0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
  return slug || 'intent'
}

function normalizeTopicType(value: unknown): TutorTopicType {
  if (value === 'grammar' || value === 'vocabulary' || value === 'contrast' || value === 'phrase_patterns' || value === 'concept') {
    return value
  }
  return 'concept'
}

function normalizeIntentType(value: unknown, topicType: TutorTopicType): TutorIntentType {
  if (
    value === 'single_rule' ||
    value === 'contrast' ||
    value === 'phrase_pattern' ||
    value === 'form_practice' ||
    value === 'mistake_clinic' ||
    value === 'short_examples' ||
    value === 'free_explanation'
  ) {
    return value
  }
  if (topicType === 'contrast') return 'contrast'
  if (topicType === 'phrase_patterns') return 'phrase_pattern'
  if (topicType === 'grammar') return 'single_rule'
  return 'short_examples'
}

function normalizeContrastPair(value: unknown): [string, string] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined
  const left = compactText(value[0], 80)
  const right = compactText(value[1], 80)
  return left && right ? [left, right] : undefined
}

function normalizeExample(value: unknown): TutorLearningIntentExample | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const en = compactText(row.en, 140)
  const ru = compactText(row.ru, 140)
  const noteRu = compactText(row.noteRu ?? row.note, 160)
  if (!en || !ru || !noteRu) return null
  return { en, ru, noteRu }
}

function makeIntent(
  params: Omit<TutorLearningIntent, 'id' | 'canonicalKey' | 'intentType' | 'coreQuestion'> & {
    id?: string
    canonicalKey?: string
    intentType?: TutorIntentType
    coreQuestion?: string
  }
): TutorLearningIntent {
  const topicType = normalizeTopicType(params.topicType)
  const intentType = normalizeIntentType(params.intentType, topicType)
  return {
    ...params,
    id: params.id?.trim() || slugify(params.title),
    canonicalKey: params.canonicalKey?.trim() || slugify(params.title),
    intentType,
    topicType,
    coreQuestion: params.coreQuestion?.trim() || params.learnerQuestionRu,
    targetPatterns: params.targetPatterns.filter(Boolean).slice(0, MAX_LIST_ITEMS),
    examples: params.examples.filter((example) => example.en && example.ru).slice(0, MAX_EXAMPLES),
    commonMistakes: params.commonMistakes.filter(Boolean).slice(0, MAX_LIST_ITEMS),
    mustTrain: params.mustTrain.filter(Boolean).slice(0, MAX_LIST_ITEMS),
    mustAvoid: params.mustAvoid.filter(Boolean).slice(0, MAX_LIST_ITEMS),
  }
}

export function normalizeTutorLearningIntent(input: unknown): TutorLearningIntent | null {
  if (!input || typeof input !== 'object') return null
  const row = input as Record<string, unknown>
  const title = compactText(row.title, 80)
  const goalRu = compactText(row.goalRu, 180)
  const examples = Array.isArray(row.examples)
    ? row.examples.map(normalizeExample).filter((example): example is TutorLearningIntentExample => example !== null)
    : []
  const targetPatterns = compactList(row.targetPatterns)
  if (!title || !goalRu || examples.length === 0 || targetPatterns.length === 0) return null
  const learnerQuestionRu = compactText(row.learnerQuestionRu, 180) || `Разобраться с темой: ${title}`
  const firstPracticeGoalRu = compactText(row.firstPracticeGoalRu, 180) || goalRu
  const topicType = normalizeTopicType(row.topicType)
  return makeIntent({
    id: compactText(row.id, 80) || slugify(title),
    canonicalKey: compactText(row.canonicalKey, 100) || slugify(title),
    title,
    intentType: normalizeIntentType(row.intentType, topicType),
    learnerQuestionRu,
    topicType,
    coreQuestion: compactText(row.coreQuestion, 180) || learnerQuestionRu,
    contrastPair: normalizeContrastPair(row.contrastPair),
    meaningFocus: compactText(row.meaningFocus, 180),
    goalRu,
    targetPatterns,
    examples,
    commonMistakes: compactList(row.commonMistakes),
    mustTrain: compactList(row.mustTrain).length ? compactList(row.mustTrain) : targetPatterns,
    mustAvoid: compactList(row.mustAvoid),
    firstPracticeGoalRu,
  })
}

export function isTutorLearningIntent(input: unknown): input is TutorLearningIntent {
  return normalizeTutorLearningIntent(input) !== null
}

export function normalizeTutorLearningIntentOptions(input: unknown): TutorLearningIntent[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const result: TutorLearningIntent[] = []
  for (const item of input) {
    const intent = normalizeTutorLearningIntent(item)
    if (!intent) continue
    const key = intent.id.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(intent)
    if (result.length >= 5) break
  }
  return result
}

export function createTutorLearningIntentCacheKey(intent?: TutorLearningIntent | null): string {
  if (!intent) return ''
  return [intent.id, intent.title, ...intent.targetPatterns, ...intent.examples.map((example) => example.en)].join('|')
}

export function buildFallbackTutorLearningIntent(topic: string): TutorLearningIntent {
  const safeTopic = compactText(topic, 80) || 'English topic'
  return makeIntent({
    id: slugify(safeTopic),
    canonicalKey: slugify(safeTopic),
    title: safeTopic,
    intentType: 'short_examples',
    learnerQuestionRu: `Понять и потренировать тему: ${safeTopic}.`,
    topicType: 'concept',
    coreQuestion: `Как использовать ${safeTopic} в коротких английских фразах?`,
    goalRu: `Увидеть ${safeTopic} в коротких английских фразах и применить без лишней теории.`,
    targetPatterns: [safeTopic],
    examples: [
      {
        en: `This example shows ${safeTopic}.`,
        ru: 'Этот пример показывает выбранную тему.',
        noteRu: 'видим тему в короткой фразе',
      },
      {
        en: `I can use ${safeTopic}.`,
        ru: 'Я могу использовать эту тему.',
        noteRu: 'переходим от смысла к практике',
      },
      {
        en: `We practice ${safeTopic} today.`,
        ru: 'Сегодня мы тренируем эту тему.',
        noteRu: 'закрепляем тему в простом контексте',
      },
    ],
    commonMistakes: ['Запоминать название темы вместо живого примера.', 'Пытаться строить длинные фразы до короткого шаблона.'],
    mustTrain: [safeTopic],
    mustAvoid: ['длинные таблицы без практики', 'служебные фразы вместо примеров'],
    firstPracticeGoalRu: `Узнать ${safeTopic} в коротком примере.`,
  })
}

export function buildShortExamplesTutorIntent(topic: string): TutorLearningIntent {
  const safeTopic = compactText(topic, 80) || 'English topic'
  return {
    ...buildFallbackTutorLearningIntent(safeTopic),
    id: `${slugify(safeTopic)}-short-examples`,
    canonicalKey: slugify(safeTopic),
    title: `${safeTopic}: Short Examples`,
    intentType: 'short_examples',
    learnerQuestionRu: `Разобрать ${safeTopic} через короткие живые примеры.`,
    coreQuestion: `Как ${safeTopic} работает в простых фразах?`,
    goalRu: `Разобрать ${safeTopic} через короткие английские примеры без лишней теории.`,
    firstPracticeGoalRu: `Узнать ${safeTopic} в короткой фразе.`,
  }
}

export function buildLessonIntroFromTutorIntent(intent: TutorLearningIntent): LessonIntro {
  const kindByTopicType: Record<TutorTopicType, LessonIntroKind> = {
    grammar: 'single_rule',
    vocabulary: 'concept',
    contrast: 'contrast',
    phrase_patterns: 'structure',
    concept: 'concept',
  }
  return {
    topic: intent.title,
    kind: kindByTopicType[intent.topicType],
    complexity: 'simple',
    quick: {
      why: [intent.goalRu, intent.learnerQuestionRu].filter(Boolean).slice(0, 3),
      how: [
        `Сначала смотри на шаблон: ${intent.targetPatterns[0]}.`,
        'Сравни короткий пример с русским смыслом.',
        'Потом собери свою фразу по тому же образцу.',
      ],
      examples: intent.examples.slice(0, 3).map((example) => ({
        en: example.en,
        ru: example.ru,
        note: example.noteRu,
      })),
      takeaway: intent.firstPracticeGoalRu,
    },
    details: {
      points: [
        `Главный фокус: ${intent.mustTrain.join(', ') || intent.targetPatterns.join(', ')}.`,
        intent.commonMistakes[0] ? `Частая ошибка: ${intent.commonMistakes[0]}` : 'Начинай с короткого шаблона, а не с длинной теории.',
      ],
      examples: intent.examples.slice(0, 3).map((example) => ({
        en: example.en,
        ru: example.ru,
        note: example.noteRu,
      })),
    },
    deepDive: {
      commonMistakes: intent.commonMistakes.length ? intent.commonMistakes.slice(0, 3) : ['Смешивать тему с похожими словами.', 'Переводить дословно с русского.'],
      selfCheckRule: `Проверь, видно ли в твоей фразе: ${intent.targetPatterns[0]}.`,
    },
    learningPlan: {
      grammarFocus: intent.mustTrain.length ? intent.mustTrain : intent.targetPatterns,
      firstPracticeGoal: intent.firstPracticeGoalRu,
    },
  }
}

export function buildPresetTutorLearningIntents(query: string): TutorLearningIntent[] {
  const q = compactText(query, 240).toLowerCase()
  if (!q) return []

  if (/\bpresent\s+simple\b|презент\s+симпл|настоящ(?:ее|ем)\s+прост/.test(q)) {
    return [
      makeIntent({
        id: 'present-simple-positive',
        canonicalKey: 'present_simple_basics',
        title: 'Present Simple: Positive Sentences',
        intentType: 'single_rule',
        learnerQuestionRu: 'Понять базовый Present Simple через короткие утверждения.',
        topicType: 'grammar',
        coreQuestion: 'Когда использовать Present Simple?',
        meaningFocus: 'регулярное действие, факт или обычное предпочтение',
        goalRu: 'Научиться говорить о привычках, фактах и регулярных действиях.',
        targetPatterns: ['I work', 'You like', 'We live'],
        examples: [
          { en: 'I work every day.', ru: 'Я работаю каждый день.', noteRu: 'регулярное действие' },
          { en: 'We live in Moscow.', ru: 'Мы живём в Москве.', noteRu: 'факт о настоящем' },
          { en: 'They like coffee.', ru: 'Им нравится кофе.', noteRu: 'обычное предпочтение' },
        ],
        commonMistakes: ['Добавлять am/is/are перед обычным глаголом.', 'Смешивать Present Simple с Present Continuous.'],
        mustTrain: ['I work', 'We live', 'They like'],
        mustAvoid: ['вопросы и отрицания до базового утверждения'],
        firstPracticeGoalRu: 'Собрать короткую утвердительную фразу о привычке или факте.',
      }),
    ]
  }

  if (/\bpast\s+simple\b|паст\s+симпл|прошедш(?:ее|ем)\s+прост/.test(q)) {
    return [
      makeIntent({
        id: 'past-simple-positive',
        canonicalKey: 'past_simple_basics',
        title: 'Past Simple: Positive Sentences',
        intentType: 'form_practice',
        learnerQuestionRu: 'Понять Past Simple через завершённые действия в прошлом.',
        topicType: 'grammar',
        coreQuestion: 'Как поставить действие в Past Simple?',
        meaningFocus: 'завершённое действие в прошлом',
        goalRu: 'Тренировать утвердительные фразы в Past Simple с V2 и -ed.',
        targetPatterns: ['I worked', 'She went', 'They played'],
        examples: [
          { en: 'I worked yesterday.', ru: 'Я работал вчера.', noteRu: 'regular verb + -ed' },
          { en: 'She went home.', ru: 'Она пошла домой.', noteRu: 'went - форма прошедшего времени' },
          { en: 'They played football.', ru: 'Они играли в футбол.', noteRu: 'действие завершилось в прошлом' },
        ],
        commonMistakes: ['Использовать первую форму глагола вместо V2.', 'Смешивать Past Simple с Present Perfect.'],
        mustTrain: ['regular verbs with -ed', 'common irregular V2', 'past time markers'],
        mustAvoid: ['вопросы и отрицания до базовой формы прошлого'],
        firstPracticeGoalRu: 'Собрать короткую фразу о завершённом действии в прошлом.',
      }),
    ]
  }

  if (/\b(?:a\s*\/\s*an|an\s+и\s+a|a\s+и\s+an|артикл.*\ba\b.*\ban\b|articles?\s+a\s*\/\s*an)\b/.test(q)) {
    return [
      makeIntent({
        id: 'articles-a-an',
        canonicalKey: 'articles_a_an',
        title: 'a/an',
        intentType: 'single_rule',
        learnerQuestionRu: 'Понять, когда ставить a, а когда an.',
        topicType: 'grammar',
        coreQuestion: 'Как выбрать a или an перед словом?',
        goalRu: 'Научиться выбирать a или an по первому звуку следующего слова.',
        targetPatterns: ['a + consonant sound', 'an + vowel sound', 'a book / an apple'],
        examples: [
          { en: 'a book', ru: 'книга', noteRu: 'b звучит как согласный, поэтому a' },
          { en: 'an apple', ru: 'яблоко', noteRu: 'a звучит как гласный, поэтому an' },
          { en: 'an hour', ru: 'час', noteRu: 'h не звучит, первый звук гласный' },
        ],
        commonMistakes: ['Смотреть только на букву, а не на звук.', 'Пропускать артикль перед одним исчисляемым предметом.'],
        mustTrain: ['a book', 'an apple', 'first sound'],
        mustAvoid: ['смешивать a/an с the на первом шаге'],
        firstPracticeGoalRu: 'Выбрать a или an перед словом по первому звуку.',
      }),
    ]
  }

  if (/\bthere\s+(?:is|are|was|were)\b|здесь\s+есть|там\s+есть|конструкц.*there/.test(q)) {
    return [
      makeIntent({
        id: 'there-is-there-are',
        canonicalKey: 'there_is_there_are',
        title: 'There is / There are',
        intentType: 'single_rule',
        learnerQuestionRu: 'Понять, как сказать, что что-то где-то есть.',
        topicType: 'phrase_patterns',
        coreQuestion: 'Как сказать “есть/находится” через there is / there are?',
        goalRu: 'Научиться говорить о наличии предметов через there is для одного и there are для нескольких.',
        targetPatterns: ['There is a...', 'There are...', 'place at the end'],
        examples: [
          { en: 'There is a book on the table.', ru: 'На столе есть книга.', noteRu: 'один предмет -> there is' },
          { en: 'There are two chairs in the room.', ru: 'В комнате есть два стула.', noteRu: 'несколько предметов -> there are' },
          { en: 'Is there a cafe near here?', ru: 'Здесь рядом есть кафе?', noteRu: 'в вопросе is выходит перед there' },
        ],
        commonMistakes: ['Переводить дословно: It is a book on the table.', 'Использовать there is для множественного числа.'],
        mustTrain: ['There is a...', 'There are...', 'Is there...?'],
        mustAvoid: ['смешивать there is с it is'],
        firstPracticeGoalRu: 'Выбрать there is или there are по количеству предметов.',
      }),
    ]
  }

  if (/\bhave\b.*\bhad\b|\bhad\b.*\bhave\b|have\s+(?:и|vs|or)\s+had|had\s+(?:и|vs|or)\s+have/.test(q)) {
    return [
      makeIntent({
        id: 'have-vs-had',
        canonicalKey: 'have_vs_had',
        title: 'Have vs Had',
        intentType: 'contrast',
        learnerQuestionRu: 'Понять разницу между have и had.',
        topicType: 'contrast',
        coreQuestion: 'Когда have, а когда had?',
        contrastPair: ['have', 'had'],
        meaningFocus: 'have = сейчас есть; had = было в прошлом',
        goalRu: 'Отличить have для настоящего от had для прошлого.',
        targetPatterns: ['I have ... now', 'I had ... before', 'have vs had'],
        examples: [
          { en: 'I have a car now.', ru: 'У меня сейчас есть машина.', noteRu: 'have = есть сейчас' },
          { en: 'I had a bike before.', ru: 'У меня раньше был велосипед.', noteRu: 'had = было в прошлом' },
          { en: 'We have time today.', ru: 'У нас сегодня есть время.', noteRu: 'today/now держит настоящее' },
        ],
        commonMistakes: ['Использовать had для настоящего.', 'Смешивать had с have had.'],
        mustTrain: ['have now', 'had before', 'time marker'],
        mustAvoid: ['уходить в Present Perfect, если ученик спрашивает have vs had'],
        firstPracticeGoalRu: 'Выбрать have или had по времени ситуации.',
      }),
    ]
  }

  if (/\ba\s+lot\b.*\bmuch\b|\bmuch\b.*\ba\s+lot\b|много.*much|a\s+lot.*почему|почему.*a\s+lot/.test(q)) {
    return [
      makeIntent({
        id: 'a-lot-vs-much',
        canonicalKey: 'a_lot_vs_much',
        title: 'a lot vs much',
        intentType: 'contrast',
        learnerQuestionRu: 'Понять, почему часто a lot of, а не much.',
        topicType: 'contrast',
        coreQuestion: 'Когда звучит a lot of, а когда much?',
        contrastPair: ['a lot of', 'much'],
        meaningFocus: 'a lot of естественно в утверждениях; much чаще в вопросах и отрицаниях',
        goalRu: 'Научиться выбирать a lot of или much по типу фразы и стилю.',
        targetPatterns: ['a lot of + noun', "not much + noun", 'How much...?'],
        examples: [
          { en: 'I have a lot of work.', ru: 'У меня много работы.', noteRu: 'утверждение звучит естественно с a lot of' },
          { en: "I don't have much time.", ru: 'У меня не так много времени.', noteRu: 'в отрицании much звучит нормально' },
          { en: 'How much time do we have?', ru: 'Сколько у нас времени?', noteRu: 'в вопросе нужен much' },
        ],
        commonMistakes: ['Говорить much в обычном утверждении там, где естественнее a lot of.', 'Забывать of перед существительным.'],
        mustTrain: ['a lot of work', "don't have much time", 'How much time'],
        mustAvoid: ['объяснять только перевод “много” без типа фразы'],
        firstPracticeGoalRu: 'Выбрать a lot of или much по утверждению, вопросу или отрицанию.',
      }),
    ]
  }

  if (/\bmust\b.*\bcould\b|\bcould\b.*\bmust\b|must.*почему|почему.*must/.test(q)) {
    return [
      makeIntent({
        id: 'must-vs-could',
        canonicalKey: 'must_vs_could',
        title: 'Must vs Could',
        intentType: 'contrast',
        learnerQuestionRu: 'Понять, почему must и could дают разный смысл.',
        topicType: 'contrast',
        coreQuestion: 'Когда must, а когда could?',
        contrastPair: ['must', 'could'],
        meaningFocus: 'must = необходимость; could = возможность или мягкий вариант',
        goalRu: 'Отличить обязанность/необходимость от возможности или мягкого предложения.',
        targetPatterns: ['must + verb', 'could + verb', 'obligation vs possibility'],
        examples: [
          { en: 'You must stop.', ru: 'Ты должен остановиться.', noteRu: 'must звучит как необходимость' },
          { en: 'You could stop here.', ru: 'Ты мог бы остановиться здесь.', noteRu: 'could звучит мягче, как вариант' },
          { en: 'We must finish today.', ru: 'Мы должны закончить сегодня.', noteRu: 'сильное требование или необходимость' },
        ],
        commonMistakes: ['Использовать could там, где нужна обязанность.', 'Использовать must там, где нужен мягкий совет.'],
        mustTrain: ['must stop', 'could stop', 'obligation vs possibility'],
        mustAvoid: ['переводить оба слова как “можно/надо” без ситуации'],
        firstPracticeGoalRu: 'Выбрать must или could по силе смысла.',
      }),
    ]
  }

  if (/\bworked\b|работал.*worked|worked.*прош/.test(q)) {
    return [
      makeIntent({
        id: 'past-simple-regular-worked',
        canonicalKey: 'past_simple_regular_verbs',
        title: 'Past Simple: regular verbs',
        intentType: 'form_practice',
        learnerQuestionRu: 'Понять форму worked и другие regular verbs в Past Simple.',
        topicType: 'grammar',
        coreQuestion: 'Почему worked получает -ed?',
        meaningFocus: 'regular verb + -ed для завершённого прошлого',
        goalRu: 'Научиться строить Past Simple с правильными глаголами через -ed.',
        targetPatterns: ['work -> worked', 'play -> played', 'finish -> finished'],
        examples: [
          { en: 'I worked yesterday.', ru: 'Я работал вчера.', noteRu: 'yesterday показывает завершённое прошлое' },
          { en: 'She worked at home.', ru: 'Она работала дома.', noteRu: 'worked = форма прошлого' },
          { en: 'We played tennis.', ru: 'Мы играли в теннис.', noteRu: 'play -> played' },
        ],
        commonMistakes: ['Оставлять первую форму после маркера прошлого.', 'Добавлять -ed к неправильным глаголам вроде go.'],
        mustTrain: ['worked', 'played', 'finished'],
        mustAvoid: ['смешивать regular и irregular verbs без примеров'],
        firstPracticeGoalRu: 'Поставить -ed к правильному глаголу для прошлого.',
      }),
    ]
  }

  if (/\bwill\s+be\b|будет.*will\s+be|will\s+be.*буд/.test(q)) {
    return [
      makeIntent({
        id: 'future-simple-will-be',
        canonicalKey: 'future_simple_will_be',
        title: 'Future Simple with be',
        intentType: 'form_practice',
        learnerQuestionRu: 'Понять will be как “будет/буду/будут”.',
        topicType: 'grammar',
        coreQuestion: 'Когда говорить will be?',
        meaningFocus: 'will be = be в будущем',
        goalRu: 'Научиться строить короткие фразы с will be для будущего состояния или места.',
        targetPatterns: ['will be + adjective', 'will be at/in...', 'will be ready'],
        examples: [
          { en: 'I will be ready.', ru: 'Я буду готов.', noteRu: 'буду + состояние' },
          { en: 'She will be at home.', ru: 'Она будет дома.', noteRu: 'будет + место' },
          { en: 'It will be cold tomorrow.', ru: 'Завтра будет холодно.', noteRu: 'tomorrow показывает будущее' },
        ],
        commonMistakes: ['Говорить will is вместо will be.', 'Забывать be после will.'],
        mustTrain: ['will be ready', 'will be at home', 'will be cold'],
        mustAvoid: ['смешивать will be с will + обычный глагол без необходимости'],
        firstPracticeGoalRu: 'Собрать короткую фразу с will be.',
      }),
    ]
  }

  if (/^has$/.test(q)) {
    return [
      makeIntent({
        id: 'have-has-possession',
        canonicalKey: 'have_has_possession',
        title: 'Have / Has — possession',
        intentType: 'single_rule',
        learnerQuestionRu: 'Понять has как “имеет/есть у него или неё”.',
        topicType: 'grammar',
        coreQuestion: 'Когда использовать has?',
        meaningFocus: 'has = have для he/she/it',
        goalRu: 'Научиться использовать has с he, she, it.',
        targetPatterns: ['I have', 'She has', 'He has'],
        examples: [
          { en: 'I have a car.', ru: 'У меня есть машина.', noteRu: 'с I используем have' },
          { en: 'She has a dog.', ru: 'У неё есть собака.', noteRu: 'с she используем has' },
          { en: 'He has time.', ru: 'У него есть время.', noteRu: 'с he используем has' },
        ],
        commonMistakes: ['Говорить she have.', 'Путать has как “имеет” и has + V3 в Present Perfect.'],
        mustTrain: ['she has', 'he has', 'it has'],
        mustAvoid: ['сразу смешивать has possession и Present Perfect'],
        firstPracticeGoalRu: 'Выбрать have или has по подлежащему.',
      }),
      makeIntent({
        id: 'present-perfect-with-has',
        canonicalKey: 'present_perfect_has',
        title: 'Has + V3 — Present Perfect',
        intentType: 'form_practice',
        learnerQuestionRu: 'Понять has как часть Present Perfect.',
        topicType: 'grammar',
        coreQuestion: 'Когда has означает Present Perfect?',
        meaningFocus: 'has + V3 = результат или опыт к настоящему',
        goalRu: 'Отличить has как “имеет” от has + третья форма глагола.',
        targetPatterns: ['has done', 'has finished', 'has gone'],
        examples: [
          { en: 'She has finished.', ru: 'Она закончила.', noteRu: 'has + V3 показывает результат' },
          { en: 'He has gone home.', ru: 'Он ушёл домой.', noteRu: 'gone = третья форма' },
          { en: 'It has started.', ru: 'Это началось.', noteRu: 'результат важен сейчас' },
        ],
        commonMistakes: ['Путать has a dog и has finished.', 'Использовать has с конкретным finished time вроде yesterday.'],
        mustTrain: ['has + V3', 'result now', 'finished/gone/started'],
        mustAvoid: ['смешивать Present Perfect с Past Simple без контекста'],
        firstPracticeGoalRu: 'Увидеть has + V3 как Present Perfect.',
      }),
      makeIntent({
        id: 'has-to-obligation',
        canonicalKey: 'has_to_obligation',
        title: 'Has to — obligation',
        intentType: 'single_rule',
        learnerQuestionRu: 'Понять has to как “должен/вынужден”.',
        topicType: 'grammar',
        coreQuestion: 'Когда has to означает обязанность?',
        meaningFocus: 'has to + verb = обязанность для he/she/it',
        goalRu: 'Научиться использовать has to для обязанности.',
        targetPatterns: ['has to work', 'has to go', 'has to wait'],
        examples: [
          { en: 'She has to work.', ru: 'Она должна работать.', noteRu: 'has to показывает обязанность' },
          { en: 'He has to go.', ru: 'Ему нужно идти.', noteRu: 'после has to идёт первая форма' },
          { en: 'It has to be ready.', ru: 'Это должно быть готово.', noteRu: 'обязанность/требование' },
        ],
        commonMistakes: ['Пропускать to после has.', 'Путать has to и has как “имеет”.'],
        mustTrain: ['has to + verb', 'obligation', 'she/he/it'],
        mustAvoid: ['смешивать has to с Present Perfect'],
        firstPracticeGoalRu: 'Собрать короткую фразу has to + verb.',
      }),
    ]
  }

  if (/\bcolou?rs?\b|цвет/.test(q)) {
    return [
      makeIntent({
        id: 'colors-adjectives',
        title: 'Colors as Adjectives',
        learnerQuestionRu: 'Понять, как цвета работают как прилагательные перед предметом.',
        topicType: 'phrase_patterns',
        goalRu: 'Научиться говорить цвет + предмет: a red car, a blue bag.',
        targetPatterns: ['color + noun', 'a red car', 'a blue bag'],
        examples: [
          { en: 'a red car', ru: 'красная машина', noteRu: 'цвет стоит перед предметом' },
          { en: 'a blue bag', ru: 'синяя сумка', noteRu: 'blue описывает bag' },
          { en: 'The car is red.', ru: 'Машина красная.', noteRu: 'после be цвет описывает предмет' },
        ],
        commonMistakes: ['Ставить цвет после предмета: a car red.', 'Путать a red car и The car is red.'],
        mustTrain: ['a red car', 'a blue bag', 'The car is red'],
        mustAvoid: ['общие фразы про colors без предметов'],
        firstPracticeGoalRu: 'Отличить a red car от The car is red.',
      }),
      makeIntent({
        id: 'color-vocabulary',
        title: 'Color Vocabulary',
        learnerQuestionRu: 'Выучить базовые названия цветов и применять их в коротких фразах.',
        topicType: 'vocabulary',
        goalRu: 'Закрепить red, blue, green, black, white в простых предложениях.',
        targetPatterns: ['red', 'blue', 'green', 'black', 'white'],
        examples: [
          { en: 'It is red.', ru: 'Это красное.', noteRu: 'короткое описание цвета' },
          { en: 'I see a green tree.', ru: 'Я вижу зелёное дерево.', noteRu: 'цвет перед предметом' },
          { en: 'My bag is black.', ru: 'Моя сумка чёрная.', noteRu: 'цвет после be' },
        ],
        commonMistakes: ['Учить список цветов без фраз.', 'Забывать предмет после цвета.'],
        mustTrain: ['red', 'blue', 'green'],
        mustAvoid: ['идиомы про цвета на первом шаге'],
        firstPracticeGoalRu: 'Назвать цвет в короткой фразе.',
      }),
    ]
  }

  if (/\bnumbers?\b|цифр|числ/.test(q)) {
    return [
      makeIntent({
        id: 'numbers-in-sentences',
        title: 'Numbers in Sentences',
        learnerQuestionRu: 'Научиться использовать числа в реальных коротких фразах.',
        topicType: 'vocabulary',
        goalRu: 'Тренировать числа для количества, цены, возраста и номеров.',
        targetPatterns: ['I have two...', 'It costs five...', 'Room twelve'],
        examples: [
          { en: 'I have two cats.', ru: 'У меня две кошки.', noteRu: 'число показывает количество' },
          { en: 'It costs five dollars.', ru: 'Это стоит пять долларов.', noteRu: 'число в цене' },
          { en: 'Room twelve is here.', ru: 'Комната двенадцать здесь.', noteRu: 'число как номер' },
        ],
        commonMistakes: ['Учить цифры без ситуации.', 'Путать number и plural после него.'],
        mustTrain: ['two cats', 'five dollars', 'room twelve'],
        mustAvoid: ['абстрактные определения numbers'],
        firstPracticeGoalRu: 'Поставить число в короткую жизненную фразу.',
      }),
    ]
  }

  if (/\banimals?\b|животн|звер/.test(q)) {
    return [
      makeIntent({
        id: 'animals-basic-sentences',
        title: 'Animals in Simple Sentences',
        learnerQuestionRu: 'Учить животных не списком, а в простых английских фразах.',
        topicType: 'vocabulary',
        goalRu: 'Тренировать animal words через It is, I see, I have.',
        targetPatterns: ['It is a dog', 'I see two birds', 'I have a cat'],
        examples: [
          { en: 'It is a dog.', ru: 'Это собака.', noteRu: 'называем животное' },
          { en: 'I see two birds.', ru: 'Я вижу двух птиц.', noteRu: 'животное во множественном числе' },
          { en: 'I have a cat.', ru: 'У меня есть кошка.', noteRu: 'животное в личной фразе' },
        ],
        commonMistakes: ['Учить слова без артикля a.', 'Забывать -s во множественном числе.'],
        mustTrain: ['a dog', 'two birds', 'a cat'],
        mustAvoid: ['редкие названия животных в первом уроке'],
        firstPracticeGoalRu: 'Назвать животное в простой фразе.',
      }),
    ]
  }

  if (/\bfamily\b|\brelatives?\b|семь|родствен/.test(q)) {
    return [
      makeIntent({
        id: 'family-basic-sentences',
        title: 'Family and Relatives',
        learnerQuestionRu: 'Научиться говорить о родственниках в простых фразах.',
        topicType: 'vocabulary',
        goalRu: 'Тренировать mother, brother, sister, cousin с my/his/her.',
        targetPatterns: ['my mother', 'his brother', 'Who is she?'],
        examples: [
          { en: 'This is my mother.', ru: 'Это моя мама.', noteRu: 'my показывает чей родственник' },
          { en: 'He is her brother.', ru: 'Он её брат.', noteRu: 'her связывает человека и родственника' },
          { en: 'Who is she?', ru: 'Кто она?', noteRu: 'вопрос о человеке' },
        ],
        commonMistakes: ['Забывать my/his/her.', 'Путать he/she при описании родственника.'],
        mustTrain: ['my mother', 'her brother', 'Who is she'],
        mustAvoid: ['длинные родословные вместо коротких фраз'],
        firstPracticeGoalRu: 'Сказать, кто кем приходится.',
      }),
    ]
  }

  if (/\bplural\b|множествен/.test(q)) {
    return [
      makeIntent({
        id: 'plural-nouns',
        title: 'Plural Nouns',
        learnerQuestionRu: 'Понять, как сделать из одного предмета несколько.',
        topicType: 'grammar',
        goalRu: 'Тренировать cat/cats, box/boxes и частые irregular forms.',
        targetPatterns: ['cat -> cats', 'box -> boxes', 'child -> children'],
        examples: [
          { en: 'one cat, two cats', ru: 'одна кошка, две кошки', noteRu: 'обычно добавляем -s' },
          { en: 'one box, two boxes', ru: 'одна коробка, две коробки', noteRu: 'после x добавляем -es' },
          { en: 'one child, two children', ru: 'один ребёнок, двое детей', noteRu: 'особая форма' },
        ],
        commonMistakes: ['Забывать -s после числа.', 'Писать childs вместо children.'],
        mustTrain: ['cats', 'boxes', 'children'],
        mustAvoid: ['слишком редкие исключения'],
        firstPracticeGoalRu: 'Отличить один предмет от нескольких.',
      }),
    ]
  }

  if (/\bget\b|гет/.test(q)) {
    return [
      makeIntent({
        id: 'get-basic-meanings',
        title: 'Get: Basic Meanings',
        learnerQuestionRu: 'Понять основные живые значения get без длинного списка.',
        topicType: 'concept',
        goalRu: 'Разобрать get как получить, стать, добраться, понять.',
        targetPatterns: ['get a message', 'get tired', 'get home', 'I get it'],
        examples: [
          { en: 'I get a message.', ru: 'Я получаю сообщение.', noteRu: 'get = получить' },
          { en: 'I get tired.', ru: 'Я устаю.', noteRu: 'get = стать каким-то' },
          { en: 'I get home.', ru: 'Я добираюсь домой.', noteRu: 'get = добраться' },
          { en: 'I get it.', ru: 'Я понял.', noteRu: 'get = понять в разговорной речи' },
        ],
        commonMistakes: ['Искать один перевод get для всех случаев.', 'Учить get списком без коротких фраз.'],
        mustTrain: ['get a message', 'get tired', 'get home', 'I get it'],
        mustAvoid: ['фразовые глаголы get off/get over на первом шаге'],
        firstPracticeGoalRu: 'Выбрать значение get по ситуации.',
      }),
    ]
  }

  if (/\bhave\b/.test(q) && /\bhad\b/.test(q)) {
    return [
      makeIntent({
        id: 'have-vs-had',
        title: 'Have vs Had',
        learnerQuestionRu: 'Понять разницу между have и had в простых фразах.',
        topicType: 'contrast',
        goalRu: 'Тренировать have для сейчас и had для прошлого.',
        targetPatterns: ['I have ... now', 'I had ... before', 'have vs had'],
        examples: [
          { en: 'I have a car now.', ru: 'У меня сейчас есть машина.', noteRu: 'have = есть сейчас' },
          { en: 'I had a bike before.', ru: 'У меня раньше был велосипед.', noteRu: 'had = было в прошлом' },
          { en: 'We have time today.', ru: 'У нас сегодня есть время.', noteRu: 'have про настоящее' },
        ],
        commonMistakes: ['Смешивать had с have had.', 'Использовать had для настоящего времени.'],
        mustTrain: ['I have', 'I had', 'now', 'before'],
        mustAvoid: ['have had как Present Perfect, если ученик не выбрал это отдельно'],
        firstPracticeGoalRu: 'Выбрать have или had по времени ситуации.',
      }),
    ]
  }

  if (/\bpresent perfect\b/.test(q) && /(важн|зачем|нуж|why|important|matter)/.test(q)) {
    return [
      makeIntent({
        id: 'why-present-perfect-matters',
        title: 'Why Present Perfect Matters',
        learnerQuestionRu: 'Понять, зачем нужен Present Perfect, а не просто выучить форму.',
        topicType: 'concept',
        goalRu: 'Увидеть связь прошлого с настоящим и отличие от Past Simple.',
        targetPatterns: ['I have lost...', 'I lost... yesterday', 'past result now'],
        examples: [
          { en: 'I have lost my keys.', ru: 'Я потерял ключи, и сейчас это важно.', noteRu: 'результат прошлого виден сейчас' },
          { en: 'I lost my keys yesterday.', ru: 'Я потерял ключи вчера.', noteRu: 'Past Simple называет завершённое время' },
          { en: 'She has finished her work.', ru: 'Она закончила работу.', noteRu: 'важен результат сейчас' },
        ],
        commonMistakes: ['Сводить Present Perfect только к словам ever/never.', 'Использовать finished time с Present Perfect.'],
        mustTrain: ['have lost', 'lost yesterday', 'has finished'],
        mustAvoid: ['длинные таблицы всех случаев Present Perfect'],
        firstPracticeGoalRu: 'Понять, когда прошлое важно для настоящего.',
      }),
    ]
  }

  return []
}
