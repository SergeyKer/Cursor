import { RU_TOPIC_KEYWORD_TO_EN, normalizeRuTopicKeyword, normalizeTopicToken } from '@/lib/ruTopicKeywordMap'

function isSoftCommentTone(audience: 'child' | 'adult', level: string): boolean {
  return audience === 'child' || (audience === 'adult' && ['starter', 'a1', 'a2'].includes(level))
}

type GlossPair = {
  ru: string
  en: string
}

function collectRussianGlossPairs(userText: string): GlossPair[] {
  const pairs: GlossPair[] = []
  const seen = new Set<string>()
  const words = userText.match(/[А-Яа-яЁё]+/g) ?? []
  for (const word of words) {
    const normalized = normalizeRuTopicKeyword(word)
    const en = RU_TOPIC_KEYWORD_TO_EN[normalized]
    if (!en) continue
    const key = `${normalized}:${en}`
    if (seen.has(key)) continue
    seen.add(key)
    pairs.push({ ru: word, en })
  }
  return pairs
}

function formatGlossHint(userText: string): string {
  const pairs = collectRussianGlossPairs(userText)
  if (pairs.length === 0) return ''
  const shown = pairs.slice(0, 3).map(({ ru, en }) => `${ru} = ${en}`).join(', ')
  return ` Подсказка: ${shown}.`
}

function hasLikePlusBareInfinitive(text: string): boolean {
  return /\blike\s+(?!to\b)(eat|drink|sleep|cook|play|read|write|go|swim|run|work|have|make|do|get|take|see|come|buy|visit|watch|listen)\b/i.test(
    text
  )
}

/**
 * Комментарий для финального fallback при смешанном/русском вводе (не про «время», а про язык ответа).
 * Совет про «like + to + инфинитив» только если после like реально стоит глагол.
 */
export function buildMixedDialogueFallbackComment(params: {
  audience: 'child' | 'adult'
  level: string
  userText: string
}): string {
  const soft = isSoftCommentTone(params.audience, params.level)
  const tryAgain = params.audience === 'child' ? 'Попробуй ещё раз!' : 'Попробуйте ещё раз.'
  const glossHint = formatGlossHint(params.userText)
  const mentionsLike = hasLikePlusBareInfinitive(params.userText)

  if (params.audience === 'child') {
    const likeTip = mentionsLike
      ? ' После «like» обычно нужно «to» и глагол (например, like to eat).'
      : ''
    return `Комментарий: Напиши ответ полностью на английском — русские слова замени английскими.${glossHint}${likeTip} ${tryAgain}`
  }
  if (soft) {
    const likeTip = mentionsLike
      ? ' После like обычно нужен to и инфинитив глагола (например, like to eat).'
      : ''
    return `Комментарий: Напишите ответ полностью на английском — русские слова замените английскими.${glossHint}${likeTip} ${tryAgain}`
  }
  const likeTip = mentionsLike ? ' Проверьте конструкцию like + to + инфинитив.' : ''
  return `Комментарий: Ответ должен быть целиком на английском; замените русские слова английскими.${glossHint}${likeTip} Попробуйте ещё раз.`
}

/** Длинные русские фрагменты до пошаговой замены слов (смысл «выиграл у нас» и т.п.). */
function applyMixedRuPhrases(text: string): string {
  let t = text
  const pairs: Array<[RegExp, string]> = [
    [/выиграл\s+у\s+нас/gi, 'won against us'],
    [/выиграли\s+у\s+нас/gi, 'won against us'],
    [/выиграла\s+у\s+нас/gi, 'won against us'],
    [/выиграло\s+у\s+нас/gi, 'won against us'],
    [/на\s+даче/gi, 'at the dacha'],
  ]
  for (const [re, rep] of pairs) {
    t = t.replace(re, rep)
  }
  return t
}

function replaceCyrillicWordsWithEnglish(
  userText: string,
  map: Record<string, string>,
): { text: string; replacedAny: boolean } {
  let text = userText
  let replacedAny = false
  const words = userText.match(/[А-Яа-яЁё]+/g) ?? []
  for (const w of words) {
    const n = normalizeTopicToken(w)
    const en = map[n]
    if (en) {
      const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      text = text.replace(re, en)
      replacedAny = true
    }
  }
  return { text, replacedAny }
}

/** Типичная ошибка: like + голый инфинитив без to. */
function fixLikePlusBareInfinitive(s: string): string {
  return s.replace(
    /\blike\s+(?!to\b)(eat|drink|sleep|cook|play|read|write|go|swim|run|work|have|make|do|get|take|see|come|buy|visit|watch|listen)\b/gi,
    (_, v: string) => `like to ${v.toLowerCase()}`,
  )
}

/** Узкие частые опечатки ученика в латинице — не общий spellchecker. */
function applyCommonLearnerLatinTypos(s: string): string {
  let t = s
  t = t.replace(/\btriing\b/gi, 'trying')
  t = t.replace(/\bwisited\b/gi, 'visited')
  return t
}

function fixLikePlusKnownObject(s: string): string {
  return s.replace(/\blike\s+(headlight)\b/gi, (_, noun: string) => `like the ${noun.toLowerCase()}`)
}

function finalizeEnglishSentence(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ')
  if (!t) return t
  const c = t.charAt(0).toUpperCase() + t.slice(1)
  return /[.!?]$/.test(c) ? c : `${c}.`
}

function isAcceptableRepeat(s: string): boolean {
  return /[A-Za-z]/.test(s) && !/[А-Яа-яЁё]/.test(s)
}

function isPlausibleLearnerSentence(s: string): boolean {
  const words = s.trim().split(/\s+/).filter(Boolean)
  return words.length >= 2
}

function genericRepeatByTense(tense: string): string {
  switch (tense) {
    case 'present_simple':
      return 'I usually answer in English.'
    case 'present_continuous':
      return 'I am answering in English now.'
    case 'present_perfect':
      return 'I have answered in English.'
    case 'present_perfect_continuous':
      return 'I have been answering in English.'
    case 'past_simple':
      return 'I answered in English.'
    case 'past_continuous':
      return 'I was answering in English.'
    case 'past_perfect':
      return 'I had answered in English.'
    case 'past_perfect_continuous':
      return 'I had been answering in English.'
    case 'future_simple':
      return 'I will answer in English.'
    case 'future_continuous':
      return 'I will be answering in English.'
    case 'future_perfect':
      return 'I will have answered in English.'
    case 'future_perfect_continuous':
      return 'I will have been answering in English.'
    case 'all':
    default:
      return 'I answered in English.'
  }
}

function hasRussianLikeIntent(tokens: string[]): boolean {
  return tokens.some((t) => ['люблю', 'любить', 'нравится', 'нравятся'].includes(t))
}

export function hasRussianDialogueFallbackSignal(userText: string): boolean {
  const tokens = (userText.match(/[А-Яа-яЁё]+/g) ?? [])
    .map((t) => normalizeRuTopicKeyword(t))
    .filter(Boolean)
  if (tokens.some((t) => RU_VERB_TO_EN_BASE[t])) return true
  return hasRussianLikeIntent(tokens) && tokens.some((t) => Boolean(RU_TOPIC_KEYWORD_TO_EN[t]))
}

function englishLikeObjectForTense(object: string, tense: string): string {
  const normalizedObject = object.trim()
  if (!normalizedObject) return genericRepeatByTense(tense)
  switch (tense) {
    case 'past_simple':
      return `I liked ${normalizedObject}.`
    case 'future_simple':
      return `I will like ${normalizedObject}.`
    case 'present_continuous':
      return `I am liking ${normalizedObject}.`
    case 'present_perfect':
      return `I have liked ${normalizedObject}.`
    case 'present_perfect_continuous':
      return `I have been liking ${normalizedObject}.`
    case 'past_continuous':
      return `I was liking ${normalizedObject}.`
    case 'past_perfect':
      return `I had liked ${normalizedObject}.`
    case 'past_perfect_continuous':
      return `I had been liking ${normalizedObject}.`
    case 'future_continuous':
      return `I will be liking ${normalizedObject}.`
    case 'future_perfect':
      return `I will have liked ${normalizedObject}.`
    case 'future_perfect_continuous':
      return `I will have been liking ${normalizedObject}.`
    case 'all':
    case 'present_simple':
    default:
      return `I like ${normalizedObject}.`
  }
}

function englishSunbatheAtDachaForTense(tense: string): string {
  switch (tense) {
    case 'present_continuous':
      return 'I am sunbathing at the dacha.'
    case 'present_perfect':
      return 'I have sunbathed at the dacha.'
    case 'present_perfect_continuous':
      return 'I have been sunbathing at the dacha.'
    case 'past_simple':
      return 'I sunbathed at the dacha.'
    case 'past_continuous':
      return 'I was sunbathing at the dacha.'
    case 'past_perfect':
      return 'I had sunbathed at the dacha.'
    case 'past_perfect_continuous':
      return 'I had been sunbathing at the dacha.'
    case 'future_simple':
      return 'I will sunbathe at the dacha.'
    case 'future_continuous':
      return 'I will be sunbathing at the dacha.'
    case 'future_perfect':
      return 'I will have sunbathed at the dacha.'
    case 'future_perfect_continuous':
      return 'I will have been sunbathing at the dacha.'
    case 'all':
    case 'present_simple':
    default:
      return 'I sunbathe at the dacha.'
  }
}

const RU_VERB_TO_EN_BASE: Record<string, string> = {
  сплю: 'sleep',
  спать: 'sleep',
  спит: 'sleep',
  спим: 'sleep',
  спят: 'sleep',
  ем: 'eat',
  есть: 'eat',
  кушаю: 'eat',
  бегаю: 'run',
  бежать: 'run',
  плаваю: 'swim',
  плавать: 'swim',
  читаю: 'read',
  читать: 'read',
  играю: 'play',
  играть: 'play',
  работаю: 'work',
  работать: 'work',
  загораю: 'sunbathe',
  загорать: 'sunbathe',
  загорает: 'sunbathe',
  загораем: 'sunbathe',
  загорают: 'sunbathe',
}

function toIng(base: string): string {
  if (base.endsWith('e') && base !== 'be') return `${base.slice(0, -1)}ing`
  if (base === 'run') return 'running'
  if (base === 'swim') return 'swimming'
  return `${base}ing`
}

function toPastParticiple(base: string): string {
  if (base === 'sleep') return 'slept'
  if (base === 'read') return 'read'
  if (base.endsWith('e')) return `${base}d`
  if (base === 'run') return 'run'
  if (base === 'swim') return 'swum'
  return `${base}ed`
}

function toPastSimple(base: string): string {
  if (base === 'sleep') return 'slept'
  if (base === 'read') return 'read'
  if (base === 'run') return 'ran'
  if (base === 'swim') return 'swam'
  if (base.endsWith('e')) return `${base}d`
  return `${base}ed`
}

function englishVerbForTense(base: string, tense: string): string {
  switch (tense) {
    case 'present_simple':
      return `I ${base}.`
    case 'present_continuous':
      return `I am ${toIng(base)}.`
    case 'present_perfect':
      return `I have ${toPastParticiple(base)}.`
    case 'present_perfect_continuous':
      return `I have been ${toIng(base)}.`
    case 'past_simple':
      return `I ${toPastSimple(base)}.`
    case 'past_continuous':
      return `I was ${toIng(base)}.`
    case 'past_perfect':
      return `I had ${toPastParticiple(base)}.`
    case 'past_perfect_continuous':
      return `I had been ${toIng(base)}.`
    case 'future_simple':
      return `I will ${base}.`
    case 'future_continuous':
      return `I will be ${toIng(base)}.`
    case 'future_perfect':
      return `I will have ${toPastParticiple(base)}.`
    case 'future_perfect_continuous':
      return `I will have been ${toIng(base)}.`
    case 'all':
    default:
      return `I ${base}.`
  }
}

export function buildMixedInputRepeatFallback(params: { userText: string; tense: string }): string {
  const { userText, tense } = params
  const lower = userText.toLowerCase()
  const ruTokens = (userText.match(/[А-Яа-яЁё]+/g) ?? [])
    .map((t) => normalizeRuTopicKeyword(t))
    .filter(Boolean)
  const translated = ruTokens
    .map((t) => RU_TOPIC_KEYWORD_TO_EN[t])
    .filter((x): x is string => Boolean(x))
  const hasVisitIntent = /\b(visi?t|visit|visited|wisit|wisited|go|went)\b/i.test(lower)
  const hasPiter = ruTokens.some((t) => t === 'питер' || t === 'петербург')
  const place = hasPiter ? 'St. Petersburg' : translated[0] ?? ''

  if (hasRussianLikeIntent(ruTokens) && translated.length > 0) {
    return englishLikeObjectForTense(translated[0] ?? '', tense)
  }

  const hasSunbatheIntent = ruTokens.some((t) =>
    ['загораю', 'загорать', 'загорает', 'загораем', 'загорают'].includes(t)
  )
  const hasDachaPlace = ruTokens.some((t) => ['дача', 'даче', 'дачу', 'дачей'].includes(t))
  if (hasSunbatheIntent && hasDachaPlace) {
    return englishSunbatheAtDachaForTense(tense)
  }

  // Кейс вида "I сплю": извлекаем русскую глагольную основу и строим ответ в нужном времени.
  const ruVerb = ruTokens.find((t) => RU_VERB_TO_EN_BASE[t])
  if (ruVerb) {
    const base = RU_VERB_TO_EN_BASE[ruVerb]
    if (base) return englishVerbForTense(base, tense)
  }

  if (hasVisitIntent && place) {
    if (tense === 'past_simple' || tense === 'all') return `I visited ${place}.`
    if (tense === 'present_simple') return `I visit ${place}.`
    if (tense === 'future_simple') return `I will visit ${place}.`
  }

  const phrased = applyMixedRuPhrases(userText)
  const { text: afterCyrillic, replacedAny } = replaceCyrillicWordsWithEnglish(phrased, RU_TOPIC_KEYWORD_TO_EN)
  const afterLike = applyCommonLearnerLatinTypos(fixLikePlusKnownObject(fixLikePlusBareInfinitive(afterCyrillic)))
  const changedLike = afterLike !== afterCyrillic

  if ((replacedAny || changedLike) && isAcceptableRepeat(afterLike) && isPlausibleLearnerSentence(afterLike)) {
    return finalizeEnglishSentence(afterLike)
  }

  const stripped = applyCommonLearnerLatinTypos(
    afterLike.replace(/[А-Яа-яЁё]+/g, ' ').replace(/\s+/g, ' ').trim(),
  )
  if (stripped && isAcceptableRepeat(stripped) && isPlausibleLearnerSentence(stripped)) {
    return finalizeEnglishSentence(stripped)
  }

  return genericRepeatByTense(tense)
}
