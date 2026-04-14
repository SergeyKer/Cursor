import { foldLatinHomoglyphsForEnglishMatch } from '@/lib/normalizeEnglishForRepeatMatch'
import { normalizeRuTopicKeyword, normalizeTopicToken, RU_TOPIC_KEYWORD_TO_EN } from '@/lib/ruTopicKeywordMap'

/** Минимальный стоп-лист для выделения «смысловых» английских токенов в подсказках. */
const CONTENT_STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'from',
  'by',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'am',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'will',
  'would',
  'can',
  'could',
  'should',
  'may',
  'might',
  'must',
  'not',
  'no',
  'so',
  'very',
  'too',
  'also',
  'just',
  'only',
  'then',
  'than',
  'that',
  'this',
  'these',
  'those',
  'there',
  'here',
  'it',
  'its',
  'we',
  'you',
  'he',
  'she',
  'they',
  'them',
  'our',
  'your',
  'my',
  'his',
  'her',
  'their',
])

const CYRILLIC = /[\u0400-\u04FF]/

function tokenizeEnglish(text: string): string[] {
  return foldLatinHomoglyphsForEnglishMatch(text)
    .toLowerCase()
    .match(/[a-z']+/g)
    ?.map((t) => t.replace(/^'+|'+$/g, ''))
    .filter(Boolean) ?? []
}

function isContentTok(t: string): boolean {
  if (!t || t.length < 3 || !/[a-z]/i.test(t)) return false
  return !CONTENT_STOP.has(t.toLowerCase())
}

function loveLikeFamily(t: string): 'love' | 'like' | null {
  const x = t.toLowerCase()
  if (/^(love|loves|loved|loving)$/.test(x)) return 'love'
  if (/^(like|likes|liked|liking)$/.test(x)) return 'like'
  return null
}

function lookSeeFamily(t: string): 'look' | 'see' | null {
  const x = t.toLowerCase()
  if (/^(look|looks|looked|looking)$/.test(x)) return 'look'
  if (/^(see|sees|saw|seen|seeing)$/.test(x)) return 'see'
  return null
}

function hintForEnPair(wrong: string, right: string): string {
  const wf = loveLikeFamily(wrong)
  const rf = loveLikeFamily(right)
  if (wf === 'love' && rf === 'like') return '(для предпочтений используем "like")'
  if (wf === 'like' && rf === 'love') return '(здесь по смыслу сильнее «любить» — love)'
  const wl = lookSeeFamily(wrong)
  const rl = lookSeeFamily(right)
  if (wl === 'look' && rl === 'see') return '(see = видеть, look = смотреть)'
  if (wl === 'see' && rl === 'look') return '(look = смотреть, see = видеть)'
  return ''
}

function collectEnglishLexiconBullets(userText: string, repeatEnglish: string): string[] {
  const userContent = tokenizeEnglish(userText).filter(isContentTok)
  const repeatContent = tokenizeEnglish(repeatEnglish).filter(isContentTok)
  const seen = new Set<string>()
  const bullets: string[] = []

  const pushBullet = (wrong: string, right: string) => {
    const key = `${wrong.toLowerCase()}→${right.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    const hint = hintForEnPair(wrong, right).trim()
    bullets.push(hint ? `${wrong} → ${right} ${hint}`.trim() : `${wrong} → ${right}`)
  }

  const repeatHasSee = repeatContent.some((t) => /^(see|sees|seeing|saw|seen)$/.test(t))
  const userHasLook = userContent.some((t) => /^(look|looks|looking|looked)$/.test(t))
  const userHasSee = userContent.some((t) => /^(see|sees|seeing|saw|seen)$/.test(t))
  if (repeatHasSee && userHasLook && !userHasSee) {
    const uSurf = userText.match(/\b(look|looks|looking|looked)\b/i)?.[1] ?? 'look'
    const rSurf = repeatEnglish.match(/\b(see|sees|seeing|saw|seen)\b/i)?.[1] ?? 'see'
    pushBullet(uSurf, rSurf)
  }

  const loveTokU = userContent.find((t) => loveLikeFamily(t) === 'love')
  const likeTokR = repeatContent.find((t) => loveLikeFamily(t) === 'like')
  if (loveTokU && likeTokR) {
    const uSurf = userText.match(/\b(love|loves|loved|loving)\b/i)?.[1] ?? 'love'
    const rSurf = repeatEnglish.match(/\b(like|likes|liked|liking)\b/i)?.[1] ?? 'like'
    pushBullet(uSurf, rSurf)
  }
  const likeTokU = userContent.find((t) => loveLikeFamily(t) === 'like')
  const loveTokR = repeatContent.find((t) => loveLikeFamily(t) === 'love')
  if (likeTokU && loveTokR) {
    const uSurf = userText.match(/\b(like|likes|liked|liking)\b/i)?.[1] ?? 'like'
    const rSurf = repeatEnglish.match(/\b(love|loves|loved|loving)\b/i)?.[1] ?? 'love'
    pushBullet(uSurf, rSurf)
  }

  const max = Math.min(userContent.length, repeatContent.length)
  for (let i = 0; i < max; i++) {
    const ut = userContent[i] ?? ''
    const rt = repeatContent[i] ?? ''
    if (!ut || !rt || ut === rt) continue
    if (ut === `${rt}s` || rt === `${ut}s`) continue
    if (loveLikeFamily(ut) && loveLikeFamily(rt) && loveLikeFamily(ut) !== loveLikeFamily(rt)) continue
    if (lookSeeFamily(ut) && lookSeeFamily(rt) && lookSeeFamily(ut) !== lookSeeFamily(rt)) continue
    const uSurf =
      new RegExp(`\\b${ut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(userText)?.[0] ?? ut
    const rSurf =
      new RegExp(`\\b${rt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(repeatEnglish)?.[0] ?? rt
    pushBullet(uSurf, rSurf)
  }

  const ruInUser = CYRILLIC.test(userText)
  if (!ruInUser && bullets.length === 0) {
    const uSet = new Set(userContent)
    const rSet = new Set(repeatContent)
    const uOnly = userContent.filter((t) => !rSet.has(t) && isContentTok(t))
    const rOnly = repeatContent.filter((t) => !uSet.has(t) && isContentTok(t))
    if (uOnly.length && rOnly.length) {
      const ut = uOnly[0]
      const rt = rOnly[0]
      if (ut && rt && ut !== rt) {
        const uSurf =
          new RegExp(`\\b${ut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(userText)?.[0] ?? ut
        const rSurf =
          new RegExp(`\\b${rt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(repeatEnglish)?.[0] ?? rt
        pushBullet(uSurf, rSurf)
      }
    }
  }

  return bullets
}

function collectRussianLexiconBullets(userText: string): string[] {
  const rawWords = userText.match(/[\u0400-\u04FF]+/g) ?? []
  const seen = new Set<string>()
  const bullets: string[] = []
  for (const raw of rawWords) {
    const key = raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const normKey = normalizeRuTopicKeyword(raw)
    const en = normKey ? RU_TOPIC_KEYWORD_TO_EN[normKey] : undefined
    const displayRu = normalizeTopicToken(raw) || raw.toLowerCase()
    if (en) {
      bullets.push(`${displayRu} → ${en} (переведи на английский)`)
    } else {
      bullets.push(`${displayRu} (переведи на английский)`)
    }
  }
  return bullets
}

export const STATIC_TRANSLATION_LINE = 'В ответе остались русские слова — переведи их на английский.'

const EMOJI_BOOK = '\u{1F4D6}'
const EMOJI_PENCIL = '\u270F\uFE0F'

/**
 * Строки для блока «Ошибки:» при смешанном вводе / лексических неточностях:
 * заголовок «Лексика» (книга) и при кириллице — «Перевод» (карандаш).
 */
export function buildTranslationErrorLexiconAndCyrillicLines(userText: string, repeatEnglish: string): string[] {
  const trimmedUser = userText.trim()
  const trimmedRepeat = repeatEnglish.trim()
  const hasCyrillic = CYRILLIC.test(trimmedUser)

  const enBullets = trimmedRepeat ? collectEnglishLexiconBullets(trimmedUser, trimmedRepeat) : []
  const ruBullets = hasCyrillic ? collectRussianLexiconBullets(trimmedUser) : []

  const lexicaSection: string[] = []
  if (enBullets.length || ruBullets.length) {
    lexicaSection.push(`${EMOJI_BOOK} Лексика:`)
    for (const b of enBullets) lexicaSection.push(`• ${b}`)
    for (const b of ruBullets) lexicaSection.push(`• ${b}`)
  }

  const translateSection: string[] = []
  if (hasCyrillic) {
    translateSection.push(`${EMOJI_PENCIL} Перевод:`)
    translateSection.push(STATIC_TRANSLATION_LINE)
  }

  if (lexicaSection.length === 0 && translateSection.length === 0) {
    return [`${EMOJI_BOOK} Лексическая ошибка. Проверь написание и выбор слова.`]
  }

  return [...lexicaSection, ...translateSection]
}
