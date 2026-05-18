import type { LessonCatalogLevel } from '@/lib/lessonCatalog'
import type { Audience, LevelId } from '@/lib/types'
import type { TutorLearningIntent } from '@/lib/tutorLearningIntent'
import type { LessonIntro } from '@/types/lesson'

export type { LessonCatalogLevel as LessonTipsCefrLevel }

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

const CACHE_VERSION = 15

export type NativeSpeechSwapAxis = 'learnerGrammar' | 'contraction' | 'length'
const MAX_RULE_LENGTH = 220
const MAX_EXAMPLES_PER_CARD = 6
const MIN_EXAMPLES_PER_CARD = 2
const MAX_QUIZ_QUESTIONS = 2

export const LESSON_TIP_CATEGORIES: readonly LessonTipCard[] = [
  {
    category: 'native_speech',
    icon: '🔊',
    title: 'Как говорят носители',
    rule: 'Носители чаще выбирают короткую живую форму: сокращение, готовый чанк или другой ритм — смотри на ситуацию и тему.',
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
  const wrong = normalizeText(row.wrong, 320)
  const right = normalizeText(row.right, 320)
  const note = normalizeText(row.note, 240)
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

function isLikelyBeContractionTopic(topic: string): boolean {
  const t = topic.toLowerCase()
  return (
    /\bcontractions?\b/i.test(t) ||
    /\bto\s+be\b/i.test(t) ||
    /\bi\s+am\b/i.test(t) ||
    /\bi'?m\b/i.test(t) ||
    /\b(you|he|she|it|we|they)'?re\b/i.test(t) ||
    (/\b(am|is|are)\b/.test(t) && /\b(from|here|happy|fine|ready|late|tired|there)\b/.test(t))
  )
}

export function isLikelyEmbeddedQuestionTopic(intro: LessonIntro): boolean {
  const topic = normalizeTopic(intro.topic).toLowerCase()
  if (/встроенн/.test(topic)) return true
  const mistakes = intro.deepDive?.commonMistakes ?? []
  if (
    mistakes.some(
      (line) =>
        /\bwhat\s+(?:does|did)\s+\w+/i.test(line) ||
        /\btell\s+me\s+where\s+is\b/i.test(line) ||
        /\bdo\s+you\s+know\s+what\s+(?:does|did)\b/i.test(line)
    )
  ) {
    return true
  }
  if (intro.kind === 'structure' && /\b(?:what|where|when)\b/i.test(topic) && /вопрос/i.test(topic)) {
    return true
  }
  return false
}

function isLikelyWhQuestionTopic(topic: string, intro?: LessonIntro): boolean {
  if (intro && isLikelyEmbeddedQuestionTopic(intro)) return false
  const t = topic.toLowerCase()
  if (/\bquestion/i.test(t) && /\b(who|what|when|where|why|how)\b/i.test(t)) return true
  if (/вопрос/i.test(t) && /\bwho\b/i.test(t)) return true
  return false
}

export function takeFirstEnglishSentence(value: string, maxLength = 120): string {
  const chunk = (value.split(/\s*·\s*|;/)[0] ?? value).trim()
  const match = chunk.match(/^[\s\S]*?[.!?](?=\s|$)|^[\s\S]+$/u)
  return normalizeText(match?.[0] ?? chunk, maxLength)
}

function exampleHasCyrillic(text: string): boolean {
  return /[а-яё]/i.test(text)
}

function exampleLooksLikeMultipleSentences(text: string): boolean {
  const trimmed = text.trim()
  const terminators = trimmed.match(/[.!?](?=\s|$)/g) ?? []
  return terminators.length > 1
}

export function getNativeSpeechSwapLabels(axis: NativeSpeechSwapAxis): { wrongLabel: string; rightLabel: string } {
  switch (axis) {
    case 'learnerGrammar':
      return { wrongLabel: 'Типичная ошибка:', rightLabel: 'Так говорят:' }
    case 'contraction':
      return { wrongLabel: 'Полная форма:', rightLabel: 'В разговоре:' }
    case 'length':
    default:
      return { wrongLabel: 'Так чаще в учебнике / длиннее:', rightLabel: 'Так чаще вслух / короче:' }
  }
}

function expandBeContractions(sentence: string): string {
  return sentence
    .replace(/\bI'm\b/gi, 'I am')
    .replace(/\bI've\b/gi, 'I have')
    .replace(/\byou're\b/gi, 'you are')
    .replace(/\bhe's\b/gi, 'he is')
    .replace(/\bshe's\b/gi, 'she is')
    .replace(/\bit's\b/gi, 'it is')
    .replace(/\bwe're\b/gi, 'we are')
    .replace(/\bthey're\b/gi, 'they are')
}

function normalizeForMeaningCompare(sentence: string): string {
  return expandBeContractions(sentence)
    .toLowerCase()
    .replace(/[.!?,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function whQuestionSameMeaning(wrong: string, right: string): boolean {
  const w = wrong.trim().toLowerCase()
  const r = right.trim().toLowerCase()
  if (!/^who\s+\w+/.test(w) || !/^who\s+\w+/.test(r)) return false
  const tailW = w.replace(/^who\s+\w+\s*/i, '').replace(/[.!?]/g, '').trim()
  const tailR = r.replace(/^who\s+\w+\s*/i, '').replace(/[.!?]/g, '').trim()
  return Boolean(tailW && tailR && tailW === tailR)
}

export function nativeSpeechWrongLooksLikeLearnerError(wrong: string): boolean {
  const w = wrong.trim()
  if (!w) return false
  if (/\bfrom\s+in\b/i.test(w)) return true
  if (/\bi am from in\b/i.test(w)) return true
  if (/\bi am student\b/i.test(w) && !/\bi am a student\b/i.test(w)) return true
  if (/\bi am engineer\b/i.test(w) && !/\bi am an engineer\b/i.test(w)) return true
  return false
}

function isUsableBeSwapSentence(sentence: string): boolean {
  const t = sentence.trim()
  if (!t || t.length > 72) return false
  if (/\//.test(t)) return false
  if (/this example is about|i can practice|how does|do you know how/i.test(t)) return false
  if ((t.match(/\bI am\b/gi) ?? []).length > 1) return false
  return true
}

function beContractionFormSwap(wrong: string, right: string): boolean {
  const fullBe = /\b(i am|you are|he is|she is|it is|we are|they are)\b/i
  const contracted = /\b(i'm|you're|he's|she's|it's|we're|they're)\b/i
  const wHasFull = fullBe.test(wrong)
  const wHasContr = contracted.test(wrong)
  const rHasFull = fullBe.test(right)
  const rHasContr = contracted.test(right)
  return (wHasFull && rHasContr && !wHasContr) || (wHasContr && rHasFull && !rHasContr)
}

export function nativeSpeechSwapSameMeaning(wrong: string, right: string): boolean {
  const w = wrong.trim()
  const r = right.trim()
  if (!w || !r) return false
  if (whQuestionSameMeaning(w, r)) return true
  if (normalizeForMeaningCompare(w) === normalizeForMeaningCompare(r)) {
    return isUsableBeSwapSentence(w) && isUsableBeSwapSentence(r) && beContractionFormSwap(w, r)
  }
  return false
}

function nativeSpeechSwapRequiresSameMeaning(
  topic: string,
  wrong: string,
  right: string,
  intro?: LessonIntro
): boolean {
  if (intro && isLikelyEmbeddedQuestionTopic(intro)) return false
  const topicNorm = normalizeTopic(topic)
  if (isLikelyWhQuestionTopic(topicNorm, intro)) return true
  if (isLikelyBeContractionTopic(topicNorm)) return true
  const fullBe = /\b(i am|you are|he is|she is|it is|we are|they are)\b/i
  const contracted = /\b(i'm|you're|he's|she's|it's|we're|they're)\b/i
  return (fullBe.test(wrong) && contracted.test(right)) || (fullBe.test(right) && contracted.test(wrong))
}

export function detectNativeSpeechSwapAxis(
  example: LessonTipExample,
  intro: LessonIntro,
  topic: string
): NativeSpeechSwapAxis {
  const wrong = (example.wrong ?? '').trim()
  const right = example.right.trim()
  const topicNorm = normalizeTopic(topic) || normalizeTopic(intro.topic)

  if (isLikelyEmbeddedQuestionTopic(intro)) {
    return 'learnerGrammar'
  }

  if (isLikelyWhQuestionTopic(topicNorm, intro)) {
    if (/^who\s+\w+[^s?]/i.test(wrong) && /who\s+\w+s\b/i.test(right)) return 'learnerGrammar'
    const mistake = intro.deepDive?.commonMistakes[0]
    if (mistake) {
      const extracted = extractLearnerMistakePhrase(mistake)
      if (extracted && wrong.toLowerCase().startsWith(extracted.toLowerCase().slice(0, Math.min(8, extracted.length)))) {
        return 'learnerGrammar'
      }
    }
    if (whQuestionSameMeaning(wrong, right)) return 'learnerGrammar'
  }

  if (nativeSpeechWrongLooksLikeLearnerError(wrong)) return 'length'

  if (isLikelyBeContractionTopic(topicNorm) && nativeSpeechSwapSameMeaning(wrong, right)) {
    const fullBe = /\b(i am|you are|he is|she is|it is|we are|they are)\b/i
    const contracted = /\b(i'm|you're|he's|she's|it's|we're|they're)\b/i
    if ((fullBe.test(wrong) && contracted.test(right)) || (fullBe.test(right) && contracted.test(wrong))) {
      return 'contraction'
    }
  }

  return 'length'
}

function toSingleSentenceSwapExample(example: LessonTipExample): LessonTipExample {
  return {
    wrong: example.wrong ? takeFirstEnglishSentence(example.wrong) : undefined,
    right: takeFirstEnglishSentence(example.right),
    note: example.note,
  }
}

function extractLearnerMistakePhrase(mistake: string): string {
  const beforeInstead = mistake.split(/\s+вместо\s+|\s+instead\s+of\s+/i)[0]?.trim() ?? mistake
  const withoutRussian = beforeInstead.replace(/[а-яёА-ЯЁ].*$/u, '').trim()
  const cleaned = withoutRussian.replace(/^✗\s*/, '').trim()
  return normalizeText(cleaned || beforeInstead.replace(/^✗\s*/, '').trim(), 120)
}

function tokenSetForCoherence(sentence: string): Set<string> {
  const raw = sentence
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s']/gi, ' ')
  const skip = new Set([
    'the',
    'and',
    'for',
    'are',
    'you',
    'not',
    'but',
    'this',
    'that',
    'with',
    'from',
    'how',
    'what',
    'when',
    'where',
    'can',
    'will',
    'have',
    'has',
    'had',
    'was',
    'were',
    'been',
    'being',
  ])
  const words = raw.split(/\s+/).filter((w) => w.length >= 4 && !skip.has(w))
  return new Set(words)
}

function nativeSpeechContrastPairCoherent(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false
  const overlap = [...tokenSetForCoherence(a)].filter((w) => tokenSetForCoherence(b).has(w)).length
  return overlap >= 1
}

function prefersTextbookSideForContrast(a: string, b: string): number {
  const fullBe = /\b(i am|you are|he is|she is|it is|we are|they are|i was|you were)\b/i
  const contracted = /\b(i'm|you're|he's|she's|it's|we're|they're|i've|you've|isn't|aren't|don't)\b/i
  let score = a.length - b.length
  if (fullBe.test(a) && !fullBe.test(b)) score += 80
  if (fullBe.test(b) && !fullBe.test(a)) score -= 80
  if (contracted.test(a) && !contracted.test(b) && !fullBe.test(a)) score -= 40
  if (contracted.test(b) && !contracted.test(a) && !fullBe.test(b)) score += 40
  return score
}

function orderContrastPairForNativeSwap(first: string, second: string): { wrong: string; right: string } {
  const t1 = first.trim()
  const t2 = second.trim()
  if (prefersTextbookSideForContrast(t1, t2) >= 0) return { wrong: t1, right: t2 }
  return { wrong: t2, right: t1 }
}

function nativeSpeechFromIntroContrast(intro: LessonIntro): LessonTipExample | null {
  const pair = intro.learningPlan?.contrastPair
  if (!pair || pair.length < 2) return null
  const rawA = takeFirstEnglishSentence(pair[0], 320)
  const rawB = takeFirstEnglishSentence(pair[1], 320)
  if (!rawA || !rawB) return null
  const ordered = orderContrastPairForNativeSwap(rawA, rawB)
  if (!nativeSpeechSwapSameMeaning(ordered.wrong, ordered.right)) return null
  if (!nativeSpeechContrastPairCoherent(ordered.wrong, ordered.right)) return null
  return toSingleSentenceSwapExample({
    wrong: ordered.wrong,
    right: ordered.right,
    note: 'Одна мысль — две формы: полная звучит книжнее, сокращение естественнее в разговоре.',
  })
}

function nativeSpeechBePairFromIntro(intro: LessonIntro): LessonTipExample | null {
  for (const line of intro.quick.how) {
    const parts = line
      .split(/\s+\/\s+/)
      .map((part) => takeFirstEnglishSentence(part.trim(), 120))
      .filter((part) => isUsableBeSwapSentence(part))
    if (parts.length < 2) continue
    const ordered = orderContrastPairForNativeSwap(parts[0], parts[1])
    if (!nativeSpeechSwapSameMeaning(ordered.wrong, ordered.right)) continue
    return toSingleSentenceSwapExample({
      wrong: ordered.wrong,
      right: ordered.right,
      note: 'Одна мысль — две формы: I am … в учебнике, I\'m … вслух.',
    })
  }

  const allEn = [
    ...intro.quick.examples.map((item) => takeFirstEnglishSentence(item.en, 120)),
    ...(intro.details?.examples ?? []).map((item) => takeFirstEnglishSentence(item.en, 120)),
  ].filter((part) => isUsableBeSwapSentence(part))

  for (let i = 0; i < allEn.length; i += 1) {
    for (let j = i + 1; j < allEn.length; j += 1) {
      const ordered = orderContrastPairForNativeSwap(allEn[i], allEn[j])
      if (!nativeSpeechSwapSameMeaning(ordered.wrong, ordered.right)) continue
      return toSingleSentenceSwapExample({
        wrong: ordered.wrong,
        right: ordered.right,
        note: 'Одна мысль — две формы: полная звучит книжнее, сокращение естественнее в разговоре.',
      })
    }
  }

  for (const en of allEn) {
    if (/\bI'm\b/i.test(en)) {
      const full = en.replace(/\bI'm\b/i, 'I am')
      if (full !== en && nativeSpeechSwapSameMeaning(full, en)) {
        return toSingleSentenceSwapExample({
          wrong: full,
          right: en,
          note: 'Одна мысль — две формы: I am … в учебнике, I\'m … вслух.',
        })
      }
    }
    if (/\bI am\b/i.test(en) && !/\bI'm\b/i.test(en)) {
      const contracted = en.replace(/\bI am\b/i, "I'm")
      if (contracted !== en && nativeSpeechSwapSameMeaning(en, contracted)) {
        return toSingleSentenceSwapExample({
          wrong: en,
          right: contracted,
          note: 'Одна мысль — две формы: I am … в учебнике, I\'m … вслух.',
        })
      }
    }
  }

  return null
}

function nativeSpeechSwapContractions(): LessonTipExample {
  return {
    wrong: 'I am happy.',
    right: "I'm happy.",
    note: 'Сокращения — норма живой речи. Полная форма в быту часто звучит книжно; в неформальном тоне — I\'m, you\'re, he\'s.',
  }
}

function nativeSpeechFromIntroEmbedded(intro: LessonIntro): LessonTipExample | null {
  const mistake = intro.deepDive?.commonMistakes[0]
  const rightFromQuick = intro.quick.examples[0]?.en
  if (mistake && rightFromQuick) {
    const wrong = extractLearnerMistakePhrase(mistake)
    if (wrong && /^[a-z0-9\s'?.,!-]+$/i.test(wrong)) {
      return toSingleSentenceSwapExample({
        wrong,
        right: takeFirstEnglishSentence(rightFromQuick, 120),
        note: 'Во второй части фразы порядок как в обычном предложении: подлежащее + глагол.',
      })
    }
  }
  return null
}

function nativeSpeechFromIntroGrammar(intro: LessonIntro): LessonTipExample | null {
  if (isLikelyWhQuestionTopic(intro.topic, intro)) {
    const mistake = intro.deepDive?.commonMistakes[0]
    const rightFromQuick = intro.quick.examples[0]?.en
    if (mistake && rightFromQuick) {
      const wrong = extractLearnerMistakePhrase(mistake)
      if (wrong && /^[a-z0-9\s'?.,!-]+$/i.test(wrong)) {
        const pair = toSingleSentenceSwapExample({
          wrong,
          right: takeFirstEnglishSentence(rightFromQuick, 120),
          note: 'После Who в Present Simple часто нужен -s у глагола — так звучит естественно.',
        })
        if (nativeSpeechSwapSameMeaning(pair.wrong ?? '', pair.right)) return pair
      }
    }
  }

  return null
}

function nativeSpeechSwapSafeGeneric(lessonCefrLevel?: LessonCatalogLevel): LessonTipExample {
  if (lessonCefrLevel === 'A1') {
    return {
      wrong: 'I am happy.',
      right: "I'm happy.",
      note: 'В разговоре чаще короткая форма I\'m — так звучит естественнее.',
    }
  }
  if (lessonCefrLevel === 'A2') {
    return {
      wrong: 'I do not know.',
      right: "I don't know.",
      note: 'Сокращение don\'t — обычная живая форма в речи.',
    }
  }
  return {
    wrong: 'I would like to help you.',
    right: 'I can help you.',
    note: 'Носители режут вежливую длину и оставляют короткий живой шаблон.',
  }
}

const BANNED_NATIVE_SWAP_PATTERNS = [
  /do you know how/i,
  /it is important that i get/i,
  /how does .+ work when you speak/i,
  /i need to nail .+ today/i,
  /could you explain how .+ fits into real speech/i,
  /sound in real chat/i,
]

export function nativeSpeechSwapLooksInvalid(
  example: LessonTipExample,
  topic: string,
  intro?: LessonIntro
): boolean {
  const wrong = example.wrong ?? ''
  const right = example.right
  const blob = `${wrong} ${right}`.toLowerCase()
  if (BANNED_NATIVE_SWAP_PATTERNS.some((pattern) => pattern.test(blob))) return true
  if (/practice this pattern|want to drill/i.test(blob)) return true
  const topicNorm = normalizeTopic(topic).toLowerCase()
  if (topicNorm.length > 4 && blob.includes(topicNorm) && /\bhow\b.+\bworks?\b/i.test(blob)) return true
  if (/\s·\s/.test(wrong) || /\s·\s/.test(right)) return true
  if (exampleHasCyrillic(wrong) || exampleHasCyrillic(right)) return true
  if (exampleLooksLikeMultipleSentences(wrong) || exampleLooksLikeMultipleSentences(right)) return true
  if (!wrong.trim()) return true
  if (intro && isLikelyEmbeddedQuestionTopic(intro)) {
    if (nativeSpeechWrongLooksLikeLearnerError(wrong)) return false
    return false
  }
  if (nativeSpeechWrongLooksLikeLearnerError(wrong) && !isLikelyWhQuestionTopic(topic, intro)) return true
  if (nativeSpeechSwapRequiresSameMeaning(topic, wrong, right, intro) && !nativeSpeechSwapSameMeaning(wrong, right)) {
    return true
  }
  return false
}

export function pickNativeSpeechSwapFirst(
  intro: LessonIntro,
  topic: string,
  _topicEn: string,
  lessonCefrLevel?: LessonCatalogLevel
): LessonTipExample {
  const candidates: LessonTipExample[] = []
  if (isLikelyEmbeddedQuestionTopic(intro)) {
    const fromEmbedded = nativeSpeechFromIntroEmbedded(intro)
    if (fromEmbedded) candidates.push(fromEmbedded)
  }
  if (isLikelyBeContractionTopic(topic)) {
    const fromBe = nativeSpeechBePairFromIntro(intro)
    if (fromBe) candidates.push(fromBe)
  }
  const fromContrast = nativeSpeechFromIntroContrast(intro)
  if (fromContrast) candidates.push(fromContrast)
  const fromGrammar = nativeSpeechFromIntroGrammar(intro)
  if (fromGrammar) candidates.push(fromGrammar)
  if (isLikelyBeContractionTopic(topic)) candidates.push(nativeSpeechSwapContractions())
  candidates.push(nativeSpeechSwapSafeGeneric(lessonCefrLevel))

  for (const candidate of candidates) {
    const single = toSingleSentenceSwapExample(candidate)
    if (!nativeSpeechSwapLooksInvalid(single, topic, intro)) return single
  }
  return toSingleSentenceSwapExample(nativeSpeechSwapSafeGeneric(lessonCefrLevel))
}

function sanitizeNativeSpeechExamples(
  examples: LessonTipExample[],
  intro: LessonIntro,
  lessonCefrLevel?: LessonCatalogLevel
): LessonTipExample[] {
  if (!examples[0]) return examples
  const topic = normalizeTopic(intro.topic)
  const topicEn = englishTopicPlaceholder(topic)
  const first = toSingleSentenceSwapExample(examples[0])
  if (!nativeSpeechSwapLooksInvalid(first, topic, intro)) return [first, ...examples.slice(1)]
  return [pickNativeSpeechSwapFirst(intro, topic, topicEn, lessonCefrLevel), ...examples.slice(1)]
}

function buildNativeSpeechQuickTrickFallback(intro: LessonIntro, topic: string): LessonTipExample {
  if (isLikelyEmbeddedQuestionTopic(intro)) {
    return {
      wrong: 'I know what does she like.',
      right: 'I know what she likes.',
      note: 'Убери does внутри второй части — порядок как в утверждении.',
    }
  }
  if (isLikelyBeContractionTopic(topic)) {
    return {
      wrong: 'I am not able to attend the meeting today.',
      right: "I can't make it to the meeting today.",
      note: "Используй can't вместо am not able to.",
    }
  }
  if (isLikelyWhQuestionTopic(topic, intro)) {
    return {
      wrong: 'Who like listening to music after work?',
      right: 'Who likes listening to music after work?',
      note: 'После Who в Present Simple добавь -s к глаголу.',
    }
  }
  const quickEn = intro.quick.examples[0]?.en
  if (quickEn && quickEn.length > 35) {
    const shortened = takeFirstEnglishSentence(quickEn.replace(/\bI am\b/gi, "I'm"), 120)
    if (shortened && shortened !== quickEn) {
      return {
        wrong: takeFirstEnglishSentence(quickEn, 120),
        right: shortened,
        note: 'Сократи: полная форма звучит книжно, сокращение — вслух.',
      }
    }
  }
  return {
    wrong: 'I would like to ask you a quick question about this.',
    right: 'Can I ask you something real quick?',
    note: 'Убери would like — короче Can I...',
  }
}

function buildRussianTrapsQuickCheckFallback(intro: LessonIntro, firstExample: LessonTipExample): LessonTipExample {
  const topic = normalizeTopic(intro.topic).toLowerCase()
  if (isLikelyEmbeddedQuestionTopic(intro)) {
    const right =
      takeFirstEnglishSentence(intro.quick.examples[0]?.en ?? 'I know what she likes.', 120) || 'I know what she likes.'
    return {
      right: right.endsWith('.') ? right : `${right}.`,
      note: 'Потому что после вводной фразы порядок обычный: подлежащее + глагол.',
    }
  }
  if (isLikelyWhQuestionTopic(intro.topic, intro)) {
    return {
      right: 'Who likes music?',
      note: 'Потому что после Who нужен -s у глагола.',
    }
  }
  if (/time\s+to/i.test(topic)) {
    return {
      right: "It's time to read.",
      note: 'Потому что после time to идёт глагол без to.',
    }
  }
  const right = takeFirstEnglishSentence(firstExample.right, 120)
  if (right && /\b(?:it's|it is)\s+time\s+to\s+[a-z]/i.test(right)) {
    return {
      right,
      note: 'Потому что после time to идёт глагол без to.',
    }
  }
  if (right && /^Who\s+/i.test(right)) {
    return {
      right: right.endsWith('?') ? right : `${right}?`,
      note: 'Потому что после Who нужен -s у глагола.',
    }
  }
  if (isLikelyBeContractionTopic(intro.topic)) {
    return {
      right: 'Who likes music?',
      note: 'Потому что после Who в Present Simple нужен -s.',
    }
  }
  return {
    right: 'Who likes this topic?',
    note: 'Потому что после Who в Present Simple нужен -s.',
  }
}

function buildQuestionsQuickFixFallback(intro: LessonIntro, firstExample: LessonTipExample): LessonTipExample {
  const topic = normalizeTopic(intro.topic)
  if (isLikelyEmbeddedQuestionTopic(intro)) {
    const question =
      intro.quick.examples.find((item) => /\?/.test(item.en))?.en ??
      intro.details?.examples.find((item) => /\?/.test(item.en))?.en ??
      'Do you know what she likes?'
    return {
      right: takeFirstEnglishSentence(question, 80) || 'Do you know what she likes?',
      note: 'Сначала Do you know, дальше what + подлежащее + глагол.',
    }
  }
  if (isLikelyBeContractionTopic(topic)) {
    const question =
      intro.quick.examples.find((item) => /\?/.test(item.en))?.en ??
      intro.details?.examples.find((item) => /\?/.test(item.en))?.en ??
      'Are you ready?'
    return {
      right: takeFirstEnglishSentence(question, 80) || 'Are you ready?',
      note: 'To be: Are + подлежащее + …, без do.',
    }
  }
  const cleaned = firstExample.right.replace(/^✓\s*/u, '').trim()
  const right = /\?/.test(cleaned)
    ? cleaned
    : `Do you like ${englishTopicPlaceholder(topic)}?`
  return {
    right,
    note: 'Общий вопрос: Do/Does перед подлежащим.',
  }
}

function buildContextStyleRuleFallback(intro: LessonIntro, firstExample: LessonTipExample): LessonTipExample {
  const formal = takeFirstEnglishSentence(firstExample.right, 120)
  return {
    note: 'Если друг в чате — короче. Если начальник — вежливее и полнее.',
    right: formal && /formal|writing|email|work/i.test(formal) ? formal : "I'd be happy to help with that.",
  }
}

function buildFallbackExamples(
  intro: LessonIntro,
  category: LessonTipCategory,
  intent?: TutorLearningIntent | null,
  lessonCefrLevel?: LessonCatalogLevel
): LessonTipExample[] {
  const topic = normalizeTopic(intro.topic) || 'эта тема'
  const topicEn = englishTopicPlaceholder(topic)
  const introExamples = uniqueExamples([...examplesFromIntent(intent), ...examplesFromIntro(intro)])
  const firstExample = introExamples[0] ?? {
    wrong: 'Русский порядок слов',
    right: `Use ${topicEn} in a short English phrase.`,
    note: 'сначала короткий шаблон, потом длинная фраза',
  }

  if (category === 'native_speech') {
    const swapFirst = pickNativeSpeechSwapFirst(intro, topic, topicEn, lessonCefrLevel)
    const quickTrick = buildNativeSpeechQuickTrickFallback(intro, topic)
    if (intent) {
      return uniqueExamples([
        swapFirst,
        {
          wrong: takeFirstEnglishSentence(introExamples[0]?.right ?? firstExample.right, 120) || quickTrick.wrong,
          right: introExamples[1]?.right ?? firstExample.right,
          note: intent.firstPracticeGoalRu || quickTrick.note,
        },
        ...introExamples,
      ])
    }
    return uniqueExamples([swapFirst, quickTrick, ...introExamples])
  }

  if (category === 'russian_traps') {
    const commonMistake = intro.deepDive?.commonMistakes[0]
    const quickCheck = buildRussianTrapsQuickCheckFallback(intro, firstExample)
    if (intent) {
      return uniqueExamples([
        {
          wrong: intent.commonMistakes[0] ?? commonMistake ?? firstExample.wrong,
          right: firstExample.right,
          note: 'сначала выбираем английский шаблон из intent, потом подставляем смысл',
        },
        {
          right: introExamples[1]?.right ?? quickCheck.right,
          note: intent.commonMistakes[1] ? `Потому что ${intent.commonMistakes[1]}` : quickCheck.note,
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
      quickCheck,
      ...introExamples,
    ])
  }

  if (category === 'questions_negatives') {
    const quickFix = buildQuestionsQuickFixFallback(intro, firstExample)
    if (intent) {
      return uniqueExamples([
        {
          wrong: intent.commonMistakes[0] ? `✗ ${intent.commonMistakes[0]}` : undefined,
          right: `✓ ${firstExample.right}`,
          note: 'проверяем форму по выбранному шаблону',
        },
        {
          right: takeFirstEnglishSentence(introExamples[1]?.right ?? quickFix.right, 120) || quickFix.right,
          note: intent.firstPracticeGoalRu || quickFix.note,
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
      quickFix,
      ...introExamples,
    ])
  }

  if (category === 'emphasis_emotion') {
    if (isLikelyEmbeddedQuestionTopic(intro)) {
      const base = takeFirstEnglishSentence(intro.quick.examples[0]?.en ?? 'I know what she likes.', 120)
      return uniqueExamples([
        {
          wrong: base,
          right: base.replace(/^I know\b/i, 'I really know'),
          note: 'really добавляет уверенность, не меняя шаблон.',
        },
        {
          wrong: 'Tell me where the station is.',
          right: 'Please tell me where the station is.',
          note: 'please смягчает просьбу в разговоре.',
        },
        ...introExamples,
      ])
    }
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
    const styleRule = buildContextStyleRuleFallback(intro, firstExample)
    if (isLikelyEmbeddedQuestionTopic(intro)) {
      return uniqueExamples([
        {
          wrong: 'Can you say when the lesson starts?',
          right: 'Could you tell me when the lesson starts?',
          note: 'к коллеге или начальнику — вежливее could you tell me',
        },
        {
          right: 'Do you know what she likes?',
          note: 'Если друг в чате — короче. Если формально — Could you tell me what she likes?',
        },
        ...introExamples,
      ])
    }
    if (intent) {
      return uniqueExamples([
        {
          wrong: firstExample.right,
          right: introExamples[1]?.right ?? firstExample.right,
          note: 'выбор фразы зависит от ситуации, но учебный фокус остаётся тем же',
        },
        {
          right: introExamples[2]?.right ?? styleRule.right,
          note: intent.firstPracticeGoalRu.includes('Если') ? intent.firstPracticeGoalRu : styleRule.note,
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
      buildContextStyleRuleFallback(intro, firstExample),
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

function buildFallbackRule(
  intro: LessonIntro,
  category: LessonTipCategory,
  intent?: TutorLearningIntent | null
): string {
  const topic = normalizeTopic(intro.topic) || 'тема'
  if (isLikelyEmbeddedQuestionTopic(intro)) {
    if (category === 'native_speech') {
      return `В теме «${topic}» вторая часть фразы — как обычное предложение: вопросительное слово + подлежащее + глагол, без лишнего does.`
    }
    if (category === 'russian_traps') {
      return 'Сначала вводная фраза, потом обычный порядок слов — как в утверждении, не как в прямом вопросе.'
    }
    if (category === 'questions_negatives') {
      return 'Does нужен только в первой части, если она сама вопрос. Внутри второй части — без does.'
    }
    if (category === 'emphasis_emotion') {
      return 'Усилитель добавляй к уже правильной фразе — сначала порядок слов, потом really или please.'
    }
    if (category === 'context_culture') {
      return 'В чате короче Do you know…; вежливее — Could you tell me…'
    }
  }
  if (intent) {
    if (category === 'native_speech')
      return `Живой фокус: ${intent.goalRu} В разговоре чаще короче и естественнее, чем «учебниковая» длина: ${intent.targetPatterns[0] ?? intent.title}.`
    if (category === 'russian_traps') return `Не переводи дословно. Сначала выбери шаблон ${intent.targetPatterns[0] ?? intent.title}, потом добавь смысл.`
    if (category === 'questions_negatives') return `Проверяй форму через цель: ${intent.firstPracticeGoalRu}`
    if (category === 'emphasis_emotion') return `Добавляй эмоцию только к готовой правильной фразе, не меняя учебный паттерн.`
    if (category === 'context_culture') return `Ситуация меняет тон, но не должна уводить от главного фокуса: ${intent.mustTrain[0] ?? intent.title}.`
  }
  if (category === 'native_speech') {
    return `В неформальной речи по теме «${topic}» носители чаще берут короткую живую форму — часто со сокращениями. Длинная полная форма в быту легко звучит книжно или как робот.`
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

export function buildFallbackLessonExtraTips(
  intro: LessonIntro,
  intent?: TutorLearningIntent | null,
  lessonCefrLevel?: LessonCatalogLevel
): LessonExtraTips {
  const topic = normalizeTopic(intro.topic) || 'выбранная тема'
  return {
    topic,
    cards: LESSON_TIP_CATEGORIES.map((base) => ({
      ...base,
      rule: buildFallbackRule(intro, base.category, intent),
      examples: buildFallbackExamples(intro, base.category, intent, lessonCefrLevel).slice(0, 3),
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

function normalizeCard(
  raw: RawCard,
  intro: LessonIntro,
  usedCategories: Set<LessonTipCategory>,
  lessonCefrLevel?: LessonCatalogLevel
): LessonTipCard | null {
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
  const finalExamples =
    detected === 'native_speech' ? sanitizeNativeSpeechExamples(examples, intro, lessonCefrLevel) : examples
  return {
    ...base,
    title: normalizeText(raw.title, 48) || base.title,
    rule,
    examples: finalExamples,
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

export function normalizeLessonExtraTips(
  input: unknown,
  intro: LessonIntro,
  intent?: TutorLearningIntent | null,
  lessonCefrLevel?: LessonCatalogLevel
): LessonExtraTips {
  const fallback = buildFallbackLessonExtraTips(intro, intent, lessonCefrLevel)
  const usedCategories = new Set<LessonTipCategory>()
  const normalizedCards = extractRawCards(input)
    .map((card) => normalizeCard(card, intro, usedCategories, lessonCefrLevel))
    .filter((card): card is LessonTipCard => card !== null)

  const byCategory = new Map(normalizedCards.map((card) => [card.category, card]))
  const cards = LESSON_TIP_CATEGORIES.map((base) => {
    const generated = byCategory.get(base.category)
    if (generated) return generated
    return fallback.cards.find((card) => card.category === base.category) ?? {
      ...base,
      rule: buildFallbackRule(intro, base.category, intent),
      examples: buildFallbackExamples(intro, base.category, intent, lessonCefrLevel).slice(0, 3),
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
