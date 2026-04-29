import type { LessonIntro, LessonIntroKind } from '@/types/lesson'

export type TutorTopicType = 'grammar' | 'vocabulary' | 'contrast' | 'phrase_patterns' | 'concept'

export type TutorLearningIntentExample = {
  en: string
  ru: string
  noteRu: string
}

export type TutorLearningIntent = {
  id: string
  title: string
  learnerQuestionRu: string
  topicType: TutorTopicType
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

function normalizeExample(value: unknown): TutorLearningIntentExample | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const en = compactText(row.en, 140)
  const ru = compactText(row.ru, 140)
  const noteRu = compactText(row.noteRu ?? row.note, 160)
  if (!en || !ru || !noteRu) return null
  return { en, ru, noteRu }
}

function makeIntent(params: Omit<TutorLearningIntent, 'id'> & { id?: string }): TutorLearningIntent {
  return {
    ...params,
    id: params.id?.trim() || slugify(params.title),
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
  return makeIntent({
    id: compactText(row.id, 80) || slugify(title),
    title,
    learnerQuestionRu,
    topicType: normalizeTopicType(row.topicType),
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
    title: safeTopic,
    learnerQuestionRu: `Понять и потренировать тему: ${safeTopic}.`,
    topicType: 'concept',
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
