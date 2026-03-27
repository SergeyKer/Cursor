import { RU_TOPIC_KEYWORD_TO_EN, normalizeTopicToken } from '@/lib/ruTopicKeywordMap'

function isSoftCommentTone(audience: 'child' | 'adult', level: string): boolean {
  return audience === 'child' || (audience === 'adult' && ['starter', 'a1', 'a2'].includes(level))
}

/**
 * Комментарий для финального fallback при смешанном латиница+кириллица (не про «время», а про язык ответа).
 * Совет про «like + to + инфинитив» только если в ответе пользователя есть слово like.
 */
export function buildMixedDialogueFallbackComment(params: {
  audience: 'child' | 'adult'
  level: string
  userText: string
}): string {
  const soft = isSoftCommentTone(params.audience, params.level)
  const tryAgain = params.audience === 'child' ? 'Попробуй ещё раз!' : 'Попробуйте ещё раз.'
  const mentionsLike = /\blike\b/i.test(params.userText)

  if (params.audience === 'child') {
    const likeTip = mentionsLike
      ? ' После «like» обычно нужно «to» и глагол (например, like to eat).'
      : ''
    return `Комментарий: Напиши ответ полностью на английском — русские слова замени английскими.${likeTip} ${tryAgain}`
  }
  if (soft) {
    const likeTip = mentionsLike
      ? ' После like обычно нужен to и инфинитив глагола (например, like to eat).'
      : ''
    return `Комментарий: Напишите ответ полностью на английском — русские слова замените английскими.${likeTip} ${tryAgain}`
  }
  const likeTip = mentionsLike ? ' Проверьте конструкцию like + to + инфинитив.' : ''
  return `Комментарий: Ответ должен быть целиком на английском; замените русские слова английскими.${likeTip} Попробуйте ещё раз.`
}

/** Длинные русские фрагменты до пошаговой замены слов (смысл «выиграл у нас» и т.п.). */
function applyMixedRuPhrases(text: string): string {
  let t = text
  const pairs: Array<[RegExp, string]> = [
    [/выиграл\s+у\s+нас/gi, 'won against us'],
    [/выиграли\s+у\s+нас/gi, 'won against us'],
    [/выиграла\s+у\s+нас/gi, 'won against us'],
    [/выиграло\s+у\s+нас/gi, 'won against us'],
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

export function buildMixedInputRepeatFallback(params: { userText: string; tense: string }): string {
  const { userText, tense } = params
  const lower = userText.toLowerCase()
  const ruTokens = (userText.match(/[А-Яа-яЁё]+/g) ?? [])
    .map((t) => normalizeTopicToken(t))
    .filter(Boolean)
  const translated = ruTokens
    .map((t) => RU_TOPIC_KEYWORD_TO_EN[t])
    .filter((x): x is string => Boolean(x))
  const hasVisitIntent = /\b(visi?t|visit|visited|wisit|wisited|go|went)\b/i.test(lower)
  const hasPiter = ruTokens.some((t) => t === 'питер' || t === 'петербург')
  const place = hasPiter ? 'St. Petersburg' : translated[0] ?? ''

  if (hasVisitIntent && place) {
    if (tense === 'past_simple' || tense === 'all') return `I visited ${place}.`
    if (tense === 'present_simple') return `I visit ${place}.`
    if (tense === 'future_simple') return `I will visit ${place}.`
  }

  const phrased = applyMixedRuPhrases(userText)
  const { text: afterCyrillic, replacedAny } = replaceCyrillicWordsWithEnglish(phrased, RU_TOPIC_KEYWORD_TO_EN)
  const afterLike = fixLikePlusBareInfinitive(afterCyrillic)
  const changedLike = afterLike !== afterCyrillic

  if ((replacedAny || changedLike) && isAcceptableRepeat(afterLike) && isPlausibleLearnerSentence(afterLike)) {
    return finalizeEnglishSentence(afterLike)
  }

  const stripped = afterLike.replace(/[А-Яа-яЁё]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (stripped && isAcceptableRepeat(stripped) && isPlausibleLearnerSentence(stripped)) {
    return finalizeEnglishSentence(stripped)
  }

  return genericRepeatByTense(tense)
}
