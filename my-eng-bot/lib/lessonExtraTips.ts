import type { Audience, LevelId } from '@/lib/types'
import type { TutorLearningIntent } from '@/lib/tutorLearningIntent'
import type { LessonIntro } from '@/types/lesson'

export type LessonTipCategory =
  | 'native_speech'
  | 'russian_traps'
  | 'questions_negatives'
  | 'emphasis_emotion'
  | 'context_culture'

export type LessonTipQuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export type LessonTipExample = {
  wrong?: string
  right: string
  note: string
}

export type LessonTipCard = {
  category: LessonTipCategory
  icon: string
  title: string
  rule: string
  examples: LessonTipExample[]
}

export type LessonExtraTips = {
  topic: string
  cards: LessonTipCard[]
  quiz: LessonTipQuizQuestion[]
}

export type CachedLessonExtraTips = {
  version: number
  createdAt: number
  generated: boolean
  tips: LessonExtraTips
}

type RawCard = {
  category?: unknown
  title?: unknown
  rule?: unknown
  examples?: unknown
}

type RawExample = {
  wrong?: unknown
  right?: unknown
  note?: unknown
}

type RawQuizQuestion = {
  id?: unknown
  question?: unknown
  options?: unknown
  correctAnswer?: unknown
  explanation?: unknown
}

const CACHE_VERSION = 8
const MAX_RULE_LENGTH = 220
const MAX_EXAMPLES_PER_CARD = 6
const MIN_EXAMPLES_PER_CARD = 2
const MAX_QUIZ_QUESTIONS = 2

export const LESSON_TIP_CATEGORIES: readonly LessonTipCard[] = [
  {
    category: 'native_speech',
    icon: '🔊',
    title: 'Как говорят носители',
    rule: 'Носители чаще берут готовый короткий кусок речи, а не собирают фразу по школьному правилу.',
    examples: [],
  },
  {
    category: 'russian_traps',
    icon: '⚠️',
    title: 'Ловушки для русскоговорящих',
    rule: 'Сначала найди английский шаблон, а уже потом подставляй слова. Так русский порядок не управляет фразой.',
    examples: [],
  },
  {
    category: 'questions_negatives',
    icon: '❓',
    title: 'Где ошибаются',
    rule: 'Ошибка часто появляется, когда русский шаблон переносится в английский вопрос или отрицание.',
    examples: [],
  },
  {
    category: 'emphasis_emotion',
    icon: '✨',
    title: 'Сделай речь ярче',
    rule: 'Усилитель должен подчеркивать эмоцию, а не звучать лишним. Смотри на ситуацию и тон фразы.',
    examples: [],
  },
  {
    category: 'context_culture',
    icon: '🌍',
    title: 'Контекст и стиль',
    rule: 'Одна и та же тема звучит по-разному в чате, письме и разговоре. Смотри на ситуацию и адресата.',
    examples: [],
  },
] as const

function normalizeText(value: unknown, maxLength = 180): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength).trim()
}

function normalizeTopic(topic: string): string {
  return topic.replace(/\s+/g, ' ').trim()
}

function englishTopicPlaceholder(topic: string): string {
  // Avoid mixing Russian topic text into English example sentences.
  return /^[a-z0-9\s'"-]+$/i.test(topic) ? topic : 'this topic'
}

function slugifyValue(value: string): string {
  const normalized = normalizeText(value, 120).toLowerCase()
  const slug = normalized
    .replace(/['"`]/g, '')
    .replace(/[^a-zа-яё0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
  return slug || 'value'
}

export function buildTipsStorageKey(params: {
  lessonKey: string
  audience: Audience
  level?: LevelId | string
}): string {
  const level = normalizeText(params.level ?? 'all', 24).toLowerCase() || 'all'
  return `tips_v${CACHE_VERSION}_${params.audience}_${level}_${slugifyValue(params.lessonKey)}`
}

function getCategoryBase(category: LessonTipCategory): LessonTipCard {
  const base = LESSON_TIP_CATEGORIES.find((item) => item.category === category)
  if (!base) return LESSON_TIP_CATEGORIES[0]
  return base
}

function detectCategory(value: unknown): LessonTipCategory | null {
  const text = normalizeText(value, 80).toLowerCase()
  if (!text) return null
  if (text.includes('native') || text.includes('носител') || text.includes('разговор') || text.includes('speech')) {
    return 'native_speech'
  }
  if (text.includes('trap') || text.includes('ловуш') || text.includes('ошиб') || text.includes('русск')) {
    return 'russian_traps'
  }
  if (text.includes('question') || text.includes('negative') || text.includes('вопрос') || text.includes('отриц')) {
    return 'questions_negatives'
  }
  if (text.includes('emphasis') || text.includes('emotion') || text.includes('эмфаз') || text.includes('эмоц')) {
    return 'emphasis_emotion'
  }
  if (text.includes('context') || text.includes('culture') || text.includes('контекст') || text.includes('культур')) {
    return 'context_culture'
  }
  return null
}

function normalizeExample(value: unknown): LessonTipExample | null {
  if (!value || typeof value !== 'object') return null
  const row = value as RawExample
  const wrong = normalizeText(row.wrong, 120)
  const right = normalizeText(row.right, 120)
  const note = normalizeText(row.note, 140)
  if (!right || !note) return null
  return wrong ? { wrong, right, note } : { right, note }
}

function exampleKey(example: LessonTipExample): string {
  return `${example.wrong ?? ''}|${example.right}|${example.note}`.toLowerCase()
}

function uniqueExamples(examples: LessonTipExample[], maxItems = MAX_EXAMPLES_PER_CARD): LessonTipExample[] {
  const seen = new Set<string>()
  const result: LessonTipExample[] = []
  for (const example of examples) {
    const key = exampleKey(example)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(example)
    if (result.length >= maxItems) break
  }
  return result
}

function examplesFromIntro(intro: LessonIntro): LessonTipExample[] {
  const examples = [...intro.quick.examples, ...(intro.details?.examples ?? [])]
  return examples.map((example) => ({
    wrong: example.ru,
    right: example.en,
    note: example.note,
  }))
}

function examplesFromIntent(intent?: TutorLearningIntent | null): LessonTipExample[] {
  if (!intent) return []
  return intent.examples.map((example) => ({
    right: example.en,
    wrong: example.ru,
    note: example.noteRu,
  }))
}

function buildFallbackExamples(intro: LessonIntro, category: LessonTipCategory, intent?: TutorLearningIntent | null): LessonTipExample[] {
  const topic = normalizeTopic(intro.topic) || 'эта тема'
  const topicEn = englishTopicPlaceholder(topic)
  const introExamples = uniqueExamples([...examplesFromIntent(intent), ...examplesFromIntro(intro)])
  const firstExample = introExamples[0] ?? {
    wrong: 'Русский порядок слов',
    right: `Use ${topicEn} in a short English phrase.`,
    note: 'сначала короткий шаблон, потом длинная фраза',
  }

  if (category === 'native_speech') {
    if (intent) {
      return uniqueExamples([
        {
          wrong: intent.learnerQuestionRu,
          right: firstExample.right,
          note: `живой короткий пример для цели: ${intent.goalRu}`,
        },
        {
          wrong: intent.targetPatterns[0] ?? intent.title,
          right: introExamples[1]?.right ?? firstExample.right,
          note: intent.firstPracticeGoalRu,
        },
        ...introExamples,
      ])
    }
    return uniqueExamples([
      {
        wrong: firstExample.wrong,
        right: firstExample.right,
        note: 'сравни длинный смысл с короткой английской фразой и повторяй готовым блоком',
      },
      {
        wrong: `Can you explain the rule for ${topicEn}?`,
        right: `How does ${topicEn} work?`,
        note: 'замени длинный учебный вопрос на короткий живой шаблон How does ... work?',
      },
      {
        wrong: `Please explain ${topicEn} to me.`,
        right: 'Listen for this pattern in short phrases.',
        note: 'ищи тему в коротких фразах из жизни: так быстрее появляется естественный порядок слов',
      },
      ...introExamples,
    ])
  }

  if (category === 'russian_traps') {
    const commonMistake = intro.deepDive?.commonMistakes[0]
    if (intent) {
      return uniqueExamples([
        {
          wrong: intent.commonMistakes[0] ?? commonMistake ?? firstExample.wrong,
          right: firstExample.right,
          note: 'сначала выбираем английский шаблон из intent, потом подставляем смысл',
        },
        {
          wrong: intent.targetPatterns[0] ?? intent.title,
          right: introExamples[1]?.right ?? firstExample.right,
          note: intent.commonMistakes[1] ?? intent.firstPracticeGoalRu,
        },
        ...introExamples,
      ])
    }
    return uniqueExamples([
      {
        wrong: commonMistake ?? firstExample.wrong,
        right: firstExample.right,
        note: 'мозг тянется к русскому шаблону и пытается собрать английскую фразу тем же порядком',
      },
      {
        wrong: `${topic}: сказать по-английски`,
        right: firstExample.right,
        note: 'правильный вариант сохраняет английский шаблон, а не русский порядок слов',
      },
      ...introExamples,
    ])
  }

  if (category === 'questions_negatives') {
    if (intent) {
      return uniqueExamples([
        {
          wrong: intent.commonMistakes[0] ? `✗ ${intent.commonMistakes[0]}` : undefined,
          right: `✓ ${firstExample.right}`,
          note: 'проверяем форму по выбранному шаблону',
        },
        {
          wrong: `Что тренируем: ${intent.mustTrain[0] ?? intent.targetPatterns[0] ?? intent.title}?`,
          right: introExamples[1]?.right ?? firstExample.right,
          note: intent.firstPracticeGoalRu,
        },
        ...introExamples,
      ])
    }
    return uniqueExamples([
      {
        wrong: `✗ You like ${topicEn}?`,
        right: `✓ Do you like ${topicEn}?`,
        note: 'пропущен вспомогательный глагол do',
      },
      {
        wrong: 'Сначала проверь, есть ли do/does/did?',
        right: `Use "Do you...?" with ${topicEn}.`,
        note: 'если это общий вопрос, ставь do/does/did перед подлежащим',
      },
      ...introExamples,
    ])
  }

  if (category === 'emphasis_emotion') {
    if (intent) {
      return uniqueExamples([
        {
          wrong: firstExample.right,
          right: firstExample.right.replace(/\.$/, '!'),
          note: `усиливаем живую фразу, но не выходим за цель: ${intent.goalRu}`,
        },
        {
          wrong: introExamples[1]?.right ?? firstExample.right,
          right: introExamples[1]?.right ?? firstExample.right,
          note: 'лучше уверенная короткая фраза, чем длинное объяснение правила',
        },
        ...introExamples,
      ])
    }
    const boosterTopic = englishTopicPlaceholder(topic)
    return uniqueExamples([
      {
        wrong: `I like ${boosterTopic}.`,
        right: `I really like ${boosterTopic}.`,
        note: 'really мягко усиливает личную оценку',
      },
      {
        wrong: `That is so true about ${boosterTopic}.`,
        right: `That is so true!`,
        note: 'so звучит естественно в живой реакции',
      },
      ...introExamples,
    ])
  }

  if (category === 'context_culture') {
    if (intent) {
      return uniqueExamples([
        {
          wrong: firstExample.right,
          right: introExamples[1]?.right ?? firstExample.right,
          note: 'выбор фразы зависит от ситуации, но учебный фокус остаётся тем же',
        },
        {
          wrong: intent.mustAvoid[0] ?? 'лишняя теория вместо короткой фразы',
          right: introExamples[2]?.right ?? firstExample.right,
          note: intent.firstPracticeGoalRu,
        },
        ...introExamples,
      ])
    }
    return uniqueExamples([
      {
        wrong: `Chat: keep ${topicEn} short and natural.`,
        right: `Email: choose the clearer, more formal version.`,
        note: 'в чате и в письме тон меняется по ситуации',
      },
      {
        wrong: `Which style fits this situation?`,
        right: `Use the casual option with friends, formal one at work.`,
        note: 'сначала смотри, кто слушает и где это сказано',
      },
      ...introExamples,
    ])
  }

  return uniqueExamples([
    {
      right: `In a chat, keep ${topicEn} short and natural.`,
      note: 'в чате лучше короткая живая фраза',
    },
    {
      right: `In formal writing, choose the clearer full form.`,
      note: 'в письме важнее ясность и аккуратный тон',
    },
    ...introExamples,
  ])
}

function buildFallbackRule(intro: LessonIntro, category: LessonTipCategory, intent?: TutorLearningIntent | null): string {
  const topic = normalizeTopic(intro.topic) || 'тема'
  if (intent) {
    if (category === 'native_speech') return `Живой фокус: ${intent.goalRu} Носитель опирается на короткий шаблон: ${intent.targetPatterns[0] ?? intent.title}.`
    if (category === 'russian_traps') return `Не переводи дословно. Сначала выбери шаблон ${intent.targetPatterns[0] ?? intent.title}, потом добавь смысл.`
    if (category === 'questions_negatives') return `Проверяй форму через цель: ${intent.firstPracticeGoalRu}`
    if (category === 'emphasis_emotion') return `Добавляй эмоцию только к готовой правильной фразе, не меняя учебный паттерн.`
    if (category === 'context_culture') return `Ситуация меняет тон, но не должна уводить от главного фокуса: ${intent.mustTrain[0] ?? intent.title}.`
  }
  if (category === 'native_speech') {
    return `В быстрой речи ${topic} лучше запоминать как готовую фразу. Носитель выбирает короткий вариант по ситуации.`
  }
  if (category === 'russian_traps') {
    return `С ${topic} сначала ищи английский шаблон. Потом добавляй смысл, не копируя русский порядок.`
  }
  if (category === 'questions_negatives') {
    return `Мозг спешит и тянет русский порядок слов. Для ${topic} сначала включи английский каркас вопроса или отрицания.`
  }
  if (category === 'emphasis_emotion') return `Сначала почувствуй тон фразы. Потом добавь really, so или definitely только там, где усиление звучит естественно.`
  if (category === 'context_culture') {
    return `Смотри на ситуацию: чат, письмо и разговор требуют разного тона, даже если мысль одна и та же.`
  }
  return `Выбирай форму под ситуацию: чат, разговор и письмо требуют разной степени формальности.`
}

export function buildFallbackLessonExtraTips(intro: LessonIntro, intent?: TutorLearningIntent | null): LessonExtraTips {
  const topic = normalizeTopic(intro.topic) || 'выбранная тема'
  return {
    topic,
    cards: LESSON_TIP_CATEGORIES.map((base) => ({
      ...base,
      rule: buildFallbackRule(intro, base.category, intent),
      examples: buildFallbackExamples(intro, base.category, intent).slice(0, 3),
    })),
    quiz: [
      {
        id: 'trap-check',
        question: `Что лучше сделать перед использованием темы «${topic}»?`,
        options: ['Перевести русскую фразу дословно', 'Проверить английский шаблон', 'Добавить больше слов'],
        correctAnswer: 'Проверить английский шаблон',
        explanation: 'Так меньше риска получить русскую кальку вместо естественной английской фразы.',
      },
      {
        id: 'context-check',
        question: 'Где уместнее короткая разговорная форма?',
        options: ['В дружеском чате', 'В официальном письме', 'В юридическом документе'],
        correctAnswer: 'В дружеском чате',
        explanation: 'Разговорные сокращения и живые фразы обычно лучше подходят для неформального общения.',
      },
    ],
  }
}

function normalizeCard(raw: RawCard, intro: LessonIntro, usedCategories: Set<LessonTipCategory>): LessonTipCard | null {
  const detected = detectCategory(raw.category) ?? detectCategory(raw.title)
  if (!detected || usedCategories.has(detected)) return null
  const base = getCategoryBase(detected)
  const examples = Array.isArray(raw.examples)
    ? uniqueExamples(raw.examples.map(normalizeExample).filter((item): item is LessonTipExample => item !== null))
    : []
  if (examples.length < MIN_EXAMPLES_PER_CARD) return null
  const rule = normalizeText(raw.rule, MAX_RULE_LENGTH)
  if (!rule) return null
  usedCategories.add(detected)
  return {
    ...base,
    title: normalizeText(raw.title, 48) || base.title,
    rule,
    examples,
  }
}

function extractRawCards(input: unknown): RawCard[] {
  if (Array.isArray(input)) return input.filter((item): item is RawCard => Boolean(item && typeof item === 'object'))
  if (!input || typeof input !== 'object') return []
  const row = input as Record<string, unknown>
  const value = row.cards ?? row.tips ?? row.categories
  if (!Array.isArray(value)) return []
  return value.filter((item): item is RawCard => Boolean(item && typeof item === 'object'))
}

function normalizeQuiz(input: unknown, fallback: LessonExtraTips): LessonTipQuizQuestion[] {
  if (!input || typeof input !== 'object') return fallback.quiz
  const row = input as Record<string, unknown>
  const rawQuiz = Array.isArray(row.quiz) ? row.quiz : Array.isArray(row.questions) ? row.questions : []
  const quiz = rawQuiz
    .filter((item): item is RawQuizQuestion => Boolean(item && typeof item === 'object'))
    .map((item, index) => {
      const question = normalizeText(item.question, 160)
      const options = Array.isArray(item.options)
        ? item.options.map((option) => normalizeText(option, 80)).filter(Boolean).slice(0, 3)
        : []
      const correctAnswer = normalizeText(item.correctAnswer, 80)
      const explanation = normalizeText(item.explanation, 180)
      if (!question || options.length < 2 || !correctAnswer || !options.includes(correctAnswer) || !explanation) return null
      return {
        id: normalizeText(item.id, 40) || `quiz-${index + 1}`,
        question,
        options,
        correctAnswer,
        explanation,
      }
    })
    .filter((item): item is LessonTipQuizQuestion => item !== null)
    .slice(0, MAX_QUIZ_QUESTIONS)

  return quiz.length === MAX_QUIZ_QUESTIONS ? quiz : fallback.quiz
}

export function normalizeLessonExtraTips(input: unknown, intro: LessonIntro, intent?: TutorLearningIntent | null): LessonExtraTips {
  const fallback = buildFallbackLessonExtraTips(intro, intent)
  const usedCategories = new Set<LessonTipCategory>()
  const normalizedCards = extractRawCards(input)
    .map((card) => normalizeCard(card, intro, usedCategories))
    .filter((card): card is LessonTipCard => card !== null)

  const byCategory = new Map(normalizedCards.map((card) => [card.category, card]))
  const cards = LESSON_TIP_CATEGORIES.map((base) => {
    const generated = byCategory.get(base.category)
    if (generated) return generated
    return fallback.cards.find((card) => card.category === base.category) ?? {
      ...base,
      rule: buildFallbackRule(intro, base.category, intent),
      examples: buildFallbackExamples(intro, base.category, intent).slice(0, 3),
    }
  })

  return {
    topic: normalizeTopic(intro.topic) || fallback.topic,
    cards,
    quiz: normalizeQuiz(input, fallback),
  }
}

export function mergeGeneratedTipAddons(current: LessonExtraTips, generated: LessonExtraTips): LessonExtraTips {
  const generatedByCategory = new Map(generated.cards.map((card) => [card.category, card]))
  return {
    ...current,
    cards: current.cards.map((card) => {
      const generatedCard = generatedByCategory.get(card.category)
      if (!generatedCard) return card
      return {
        ...card,
        examples: uniqueExamples([...card.examples, ...generatedCard.examples], MAX_EXAMPLES_PER_CARD),
      }
    }),
  }
}

export function getTipSetSignature(tips: LessonExtraTips): string[] {
  return [
    ...tips.cards.flatMap((card) => [card.rule, ...card.examples.flatMap((example) => [example.wrong ?? '', example.right, example.note])]),
    ...tips.quiz.flatMap((question) => [question.question, ...question.options, question.correctAnswer, question.explanation]),
  ]
    .map((item) => normalizeText(item, 220).toLowerCase())
    .filter(Boolean)
}

export function areTipsTooSimilar(current: LessonExtraTips, next: LessonExtraTips): boolean {
  const currentSignature = new Set(getTipSetSignature(current))
  const nextSignature = getTipSetSignature(next)
  if (nextSignature.length === 0) return true

  let overlap = 0
  for (const item of nextSignature) {
    if (currentSignature.has(item)) overlap += 1
  }

  const overlapRatio = overlap / nextSignature.length
  let changedCards = 0
  for (let index = 0; index < next.cards.length; index += 1) {
    const currentCard = current.cards[index]
    const nextCard = next.cards[index]
    if (!currentCard || !nextCard) continue
    const sameRule = normalizeText(currentCard.rule, 220).toLowerCase() === normalizeText(nextCard.rule, 220).toLowerCase()
    const sameExamples =
      currentCard.examples
        .map((example) => exampleKey(example))
        .join('||') === nextCard.examples.map((example) => exampleKey(example)).join('||')
    if (!sameRule || !sameExamples) changedCards += 1
  }

  return overlapRatio >= 0.9 && changedCards < 2
}

export function isValidCachedLessonExtraTips(input: unknown): input is CachedLessonExtraTips {
  if (!input || typeof input !== 'object') return false
  const row = input as Record<string, unknown>
  if (row.version !== CACHE_VERSION || typeof row.createdAt !== 'number' || !Number.isFinite(row.createdAt)) return false
  if (typeof row.generated !== 'boolean') return false
  const tips = row.tips as Record<string, unknown> | undefined
  return Boolean(tips && typeof tips.topic === 'string' && Array.isArray(tips.cards) && Array.isArray(tips.quiz))
}

export function toCachedLessonExtraTips(tips: LessonExtraTips, generated = true, now = Date.now()): CachedLessonExtraTips {
  return {
    version: CACHE_VERSION,
    createdAt: now,
    generated,
    tips,
  }
}
