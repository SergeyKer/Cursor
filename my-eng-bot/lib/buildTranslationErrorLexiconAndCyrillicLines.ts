import { foldLatinHomoglyphsForEnglishMatch } from '@/lib/normalizeEnglishForRepeatMatch'
import { normalizeRuTopicKeyword, normalizeTopicToken, RU_TOPIC_KEYWORD_TO_EN } from '@/lib/ruTopicKeywordMap'
import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'

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
  if (wf === 'love' && rf === 'like') return 'для предпочтений используем like'
  if (wf === 'like' && rf === 'love') return 'здесь по смыслу сильнее love'
  const wl = lookSeeFamily(wrong)
  const rl = lookSeeFamily(right)
  if (wl === 'look' && rl === 'see') return 'see = видеть, look = смотреть'
  if (wl === 'see' && rl === 'look') return 'look = смотреть, see = видеть'
  return ''
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  const left = a.toLowerCase()
  const right = b.toLowerCase()
  if (left.length === 0) return right.length
  if (right.length === 0) return left.length
  let prev = Array.from({ length: right.length + 1 }, (_, i) => i)
  let curr = new Array<number>(right.length + 1).fill(0)
  for (let i = 1; i <= left.length; i++) {
    curr[0] = i
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    const tmp = prev
    prev = curr
    curr = tmp
  }
  return prev[right.length] ?? 0
}

function tokenizeForPrefixCheck(text: string): string[] {
  return text.match(/[a-z0-9']+/gi)?.map((token) => token.toLowerCase()) ?? []
}

function isLikelySingularPluralTokenMismatch(userTok: string, goldTok: string): boolean {
  const u = userTok.toLowerCase()
  const g = goldTok.toLowerCase()
  if (u === g) return false
  if (g === `${u}s` || g === `${u}es`) return true
  if (u === `${g}s` || u === `${g}es`) return true
  if (u.length > 2 && u.endsWith('y') && g === `${u.slice(0, -1)}ies`) return true
  if (g.length > 2 && g.endsWith('ies') && u === `${g.slice(0, -3)}y`) return true
  return false
}

function isStrictTokenPrefix(userTokens: string[], goldTokens: string[]): boolean {
  if (userTokens.length === 0) return false
  if (userTokens.length >= goldTokens.length) return false
  for (let i = 0; i < userTokens.length; i++) {
    if (userTokens[i] !== goldTokens[i]) return false
  }
  return true
}

function isStrictTokenPrefixAllowingOneNominalNumberSlip(userTokens: string[], goldTokens: string[]): boolean {
  if (userTokens.length === 0 || goldTokens.length === 0) return false
  if (userTokens.length >= goldTokens.length) return false
  let iu = 0
  let ig = 0
  let usedSlip = false
  while (iu < userTokens.length && ig < goldTokens.length) {
    if (userTokens[iu] === goldTokens[ig]) {
      iu++
      ig++
      continue
    }
    if (!usedSlip && isLikelySingularPluralTokenMismatch(userTokens[iu]!, goldTokens[ig]!)) {
      usedSlip = true
      iu++
      ig++
      continue
    }
    return false
  }
  return iu === userTokens.length && ig < goldTokens.length
}

function buildIncompleteTranslationLine(userText: string, repeatEnglish: string): string | null {
  const userNorm = normalizeEnglishForLearnerAnswerMatch(userText, 'translation')
  const repeatNorm = normalizeEnglishForLearnerAnswerMatch(repeatEnglish, 'translation')
  if (!userNorm || !repeatNorm) return null
  const userTokens = tokenizeForPrefixCheck(userNorm)
  const repeatTokens = tokenizeForPrefixCheck(repeatNorm)
  const incomplete =
    isStrictTokenPrefix(userTokens, repeatTokens) ||
    isStrictTokenPrefixAllowingOneNominalNumberSlip(userTokens, repeatTokens)
  if (!incomplete) return null
  const userPreview = userText.replace(/\s+/g, ' ').trim() || 'начало фразы'
  const repeatPreview = repeatEnglish.replace(/\s+/g, ' ').trim() || 'полная фраза'
  return formatReplacementLine({
    wrong: userPreview,
    right: repeatPreview,
    reason: 'перевод неполный: добавь недостающую часть предложения',
  })
}

/** Последнее слово в ответе vs эталон: обрезки (ca/cat) и опечатки в конце фразы. */
function collectTailWordPair(userText: string, repeatEnglish: string): { wrong: string; right: string } | null {
  const userWords = userText.match(/\b[a-z']+\b/gi)
  const repeatWords = repeatEnglish.match(/\b[a-z']+\b/gi)
  if (!userWords?.length || !repeatWords?.length) return null
  const uLast = userWords[userWords.length - 1] ?? ''
  const rLast = repeatWords[repeatWords.length - 1] ?? ''
  if (!uLast || !rLast) return null
  const u = uLast.replace(/^'+|'+$/g, '').toLowerCase()
  const r = rLast.replace(/^'+|'+$/g, '').toLowerCase()
  if (u === r) return null
  if (r.length < 3) return null
  const isPrefix = u.length >= 1 && u.length < r.length && r.startsWith(u)
  let typoOk = false
  if (!isPrefix) {
    const dist = levenshteinDistance(u, r)
    typoOk = u.length >= 2 && r.length >= 3 && dist <= 2 && dist > 0
  }
  if (!isPrefix && !typoOk) return null
  const uSurf = new RegExp(`\\b${uLast.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(userText)?.[0] ?? uLast
  const rSurf = new RegExp(`\\b${rLast.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(repeatEnglish)?.[0] ?? rLast
  return { wrong: uSurf, right: rSurf }
}

type ReplacementPair = { wrong: string; right: string; reason?: string }

function trimOuterQuotes(text: string): string {
  return text.replace(/^["'`«»]+|["'`«»]+$/g, '').trim()
}

function normalizeReplacementPart(text: string): string {
  const cleaned = trimOuterQuotes(text).replace(/\s+/g, ' ').trim()
  return cleaned || text.trim()
}

function formatReplacementLine(pair: ReplacementPair): string {
  const wrong = normalizeReplacementPart(pair.wrong).replace(/"/g, "'")
  const right = normalizeReplacementPart(pair.right).replace(/"/g, "'")
  const reason = pair.reason?.trim() ?? ''
  return reason ? `- "${wrong}" → "${right}" (${reason})` : `- "${wrong}" → "${right}"`
}

function findNearestTypoCandidate(
  userTok: string,
  repeatTokens: string[],
  repeatStart: number,
  windowSize = 3
): { token: string; idx: number; distance: number } | null {
  const u = userTok.toLowerCase()
  if (!u || u.length < 3) return null
  let best: { token: string; idx: number; distance: number } | null = null
  const end = Math.min(repeatTokens.length, repeatStart + windowSize)
  for (let i = repeatStart; i < end; i++) {
    const rt = repeatTokens[i]
    if (!rt || !isContentTok(rt) || rt.length < 3) continue
    const distance = levenshteinDistance(u, rt.toLowerCase())
    if (distance <= 2 && (best == null || distance < best.distance)) {
      best = { token: rt, idx: i, distance }
      if (distance === 1) break
    }
  }
  return best
}

function collectEnglishLexiconPairs(userText: string, repeatEnglish: string): ReplacementPair[] {
  const userTokens = tokenizeEnglish(userText)
  const repeatTokens = tokenizeEnglish(repeatEnglish)
  const userContent = userTokens.filter(isContentTok)
  const repeatContent = repeatTokens.filter(isContentTok)
  const seen = new Set<string>()
  const pairs: ReplacementPair[] = []

  const pushPair = (wrong: string, right: string, reason = '') => {
    const key = `${wrong.toLowerCase()}→${right.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    const hint = reason.trim() || hintForEnPair(wrong, right).trim()
    pairs.push({ wrong, right, reason: hint })
  }

  const repeatHasSee = repeatContent.some((t) => /^(see|sees|seeing|saw|seen)$/.test(t))
  const userHasLook = userContent.some((t) => /^(look|looks|looking|looked)$/.test(t))
  const userHasSee = userContent.some((t) => /^(see|sees|seeing|saw|seen)$/.test(t))
  if (repeatHasSee && userHasLook && !userHasSee) {
    const uSurf = userText.match(/\b(look|looks|looking|looked)\b/i)?.[1] ?? 'look'
    const rSurf = repeatEnglish.match(/\b(see|sees|seeing|saw|seen)\b/i)?.[1] ?? 'see'
    pushPair(uSurf, rSurf)
  }

  const loveTokU = userContent.find((t) => loveLikeFamily(t) === 'love')
  const likeTokR = repeatContent.find((t) => loveLikeFamily(t) === 'like')
  if (loveTokU && likeTokR) {
    const uSurf = userText.match(/\b(love|loves|loved|loving)\b/i)?.[1] ?? 'love'
    const rSurf = repeatEnglish.match(/\b(like|likes|liked|liking)\b/i)?.[1] ?? 'like'
    pushPair(uSurf, rSurf)
  }
  const likeTokU = userContent.find((t) => loveLikeFamily(t) === 'like')
  const loveTokR = repeatContent.find((t) => loveLikeFamily(t) === 'love')
  if (likeTokU && loveTokR) {
    const uSurf = userText.match(/\b(like|likes|liked|liking)\b/i)?.[1] ?? 'like'
    const rSurf = repeatEnglish.match(/\b(love|loves|loved|loving)\b/i)?.[1] ?? 'love'
    pushPair(uSurf, rSurf)
  }

  let iu = 0
  let ir = 0
  while (iu < userTokens.length && ir < repeatTokens.length) {
    while (iu < userTokens.length && !isContentTok(userTokens[iu] ?? '')) iu++
    while (ir < repeatTokens.length && !isContentTok(repeatTokens[ir] ?? '')) ir++
    if (iu >= userTokens.length || ir >= repeatTokens.length) break

    const ut = userTokens[iu] ?? ''
    const rt = repeatTokens[ir] ?? ''
    if (!ut || !rt) break
    if (ut === rt) {
      iu++
      ir++
      continue
    }

    let targetRt = rt
    let advanceRepeat = 1
    let reason = ''

    const typoCandidate = findNearestTypoCandidate(ut, repeatTokens, ir)
    if (typoCandidate && typoCandidate.idx > ir) {
      targetRt = typoCandidate.token
      advanceRepeat = typoCandidate.idx - ir + 1
      reason = 'опечатка'
    }

    if (ut === `${targetRt}s` || targetRt === `${ut}s`) {
      iu++
      ir += advanceRepeat
      continue
    }
    if (
      loveLikeFamily(ut) &&
      loveLikeFamily(targetRt) &&
      loveLikeFamily(ut) !== loveLikeFamily(targetRt)
    ) {
      iu++
      ir += advanceRepeat
      continue
    }
    if (
      lookSeeFamily(ut) &&
      lookSeeFamily(targetRt) &&
      lookSeeFamily(ut) !== lookSeeFamily(targetRt)
    ) {
      iu++
      ir += advanceRepeat
      continue
    }

    const uSurf =
      new RegExp(`\\b${ut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(userText)?.[0] ?? ut
    const rSurf =
      new RegExp(`\\b${targetRt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(repeatEnglish)?.[0] ?? targetRt
    pushPair(uSurf, rSurf, reason)
    iu++
    ir += advanceRepeat
  }

  const ruInUser = CYRILLIC.test(userText)
  if (!ruInUser && pairs.length === 0) {
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
        pushPair(uSurf, rSurf)
      }
    }
  }

  if (!ruInUser && pairs.length === 0) {
    const tail = collectTailWordPair(userText, repeatEnglish)
    if (tail) pushPair(tail.wrong, tail.right, 'опечатка')
  }

  return pairs
}

function collectRussianLexiconPairs(userText: string): ReplacementPair[] {
  const rawWords = userText.match(/[\u0400-\u04FF]+/g) ?? []
  const seen = new Set<string>()
  const pairs: ReplacementPair[] = []
  for (const raw of rawWords) {
    const key = raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const normKey = normalizeRuTopicKeyword(raw)
    const en = normKey ? RU_TOPIC_KEYWORD_TO_EN[normKey] : undefined
    const displayRu = normalizeTopicToken(raw) || raw.toLowerCase()
    pairs.push({
      wrong: displayRu,
      right: en || '[перевод по контексту]',
      reason: 'переведи',
    })
  }
  return pairs
}

export const STATIC_TRANSLATION_LINE = 'В ответе остались русские слова — переведи их на английский.'

/**
 * Строки для блока «Ошибки:» в fallback-ветке.
 * Единый контракт: - "wrong" → "right" (короткая причина), максимум 3 строки.
 */
export function buildTranslationErrorLexiconAndCyrillicLines(userText: string, repeatEnglish: string): string[] {
  const trimmedUser = userText.trim()
  const trimmedRepeat = repeatEnglish.trim()
  const hasCyrillic = CYRILLIC.test(trimmedUser)

  const lines: string[] = []
  const ruPairs = hasCyrillic ? collectRussianLexiconPairs(trimmedUser) : []
  const enPairs = trimmedRepeat ? collectEnglishLexiconPairs(trimmedUser, trimmedRepeat) : []

  // Приоритет: кириллица -> лексика/структура -> опечатка, максимум 3 строки.
  for (const pair of ruPairs) {
    lines.push(formatReplacementLine(pair))
    if (lines.length >= 3) return lines
  }
  for (const pair of enPairs) {
    lines.push(formatReplacementLine(pair))
    if (lines.length >= 3) return lines
  }

  const incompleteLine = !hasCyrillic && trimmedRepeat ? buildIncompleteTranslationLine(trimmedUser, trimmedRepeat) : null
  if (incompleteLine) return [incompleteLine]

  if (lines.length > 0) return lines

  // Фолбэк-строка совместима с новым контрактом.
  return ['- "your sentence" → "full sentence" (уточни формулировку по образцу)']
}
