import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import { allowsLikeLoveEquivalence, likeLoveUserCandidates } from '@/lib/translationLikeLoveContext'
import { getClampedHiddenAndVisibleGold } from '@/lib/translationPromptAndRef'
import { extractPromptKeywords } from '@/lib/translationRepeatClamp'

export type TranslationGoldVerdict = {
  ok: boolean
  reasons: string[]
}

function normalizeForVerdictComparison(text: string): string {
  return normalizeEnglishForLearnerAnswerMatch(text, 'translation')
}

function tokenizeForVerdictPrefixCheck(text: string): string[] {
  return text.match(/[a-z0-9']+/gi)?.map((token) => token.toLowerCase()) ?? []
}

function isStrictTokenPrefix(shortTokens: string[], fullTokens: string[]): boolean {
  if (shortTokens.length === 0) return false
  if (shortTokens.length >= fullTokens.length) return false
  for (let i = 0; i < shortTokens.length; i++) {
    if (shortTokens[i] !== fullTokens[i]) return false
  }
  return true
}

/** Одна типичная ошибка числа существительного (movie/movies), без полноценной морфологии. */
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

/**
 * Ответ короче эталона: совпадает по префиксу токенов, допуская ровно одну «slip»-замену
 * вроде movie↔movies перед недостающим хвостом (на выходных → on the weekends).
 */
function isStrictTokenPrefixAllowingOneNominalNumberSlip(
  userTokens: string[],
  goldTokens: string[]
): boolean {
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

function goldMatchesPromptKeywords(ruPrompt: string, goldEnglish: string): boolean {
  const promptKeywords = extractPromptKeywords(ruPrompt)
  if (promptKeywords.length === 0) return true
  const goldTokens = new Set(tokenizeForVerdictPrefixCheck(normalizeForVerdictComparison(goldEnglish)))
  const matches = promptKeywords.filter((kw) => goldTokens.has(kw.toLowerCase())).length
  // Для более длинного промпта требуем не один случайный ключ, а как минимум два.
  const requiredMatches = promptKeywords.length >= 3 ? 2 : 1
  return matches >= requiredMatches
}

/**
 * Длинный эталон — строгая проверка ключей; короткий (≤5 токенов после нормализации) — как на карточке:
 * достаточно одного совпадения тематического ключа с RU (согласовано с мягкой plausibility для «Скажи»).
 */
function goldPlausibleForRuPrompt(ruPrompt: string, goldEnglish: string): boolean {
  if (goldMatchesPromptKeywords(ruPrompt, goldEnglish)) return true
  const goldNorm = normalizeForVerdictComparison(goldEnglish)
  const goldTokCount = tokenizeForVerdictPrefixCheck(goldNorm).length
  if (goldTokCount > 5) return false
  const promptKeywords = extractPromptKeywords(ruPrompt)
  if (promptKeywords.length === 0) return true
  const goldTokens = new Set(tokenizeForVerdictPrefixCheck(goldNorm))
  return promptKeywords.some((kw) => goldTokens.has(kw.toLowerCase()))
}

function goldHasEnoughSubstanceForPrompt(ruPrompt: string, goldEnglish: string): boolean {
  const ruWords = ruPrompt.trim().match(/[А-Яа-яЁё]+/g)?.length ?? 0
  if (ruWords < 4) return true
  const goldWords = tokenizeForVerdictPrefixCheck(normalizeForVerdictComparison(goldEnglish)).length
  return goldWords >= 3
}

function hasLikelyGibberishToken(text: string): boolean {
  const tokens = tokenizeForVerdictPrefixCheck(normalizeForVerdictComparison(text))
  return tokens.some((t) => {
    if (t.length < 8) return false
    if (/([a-z0-9])\1{3,}/i.test(t)) return true
    const vowels = (t.match(/[aeiouy]/g) ?? []).length
    return vowels === 0
  })
}

const CYRILLIC_RE = /[\u0400-\u04FF]/

/**
 * Строгий вердикт: ответ засчитывается только если совпадает с эталоном после узкой нормализации
 * (сокращения + регистр + пунктуация + compound words), либо like/love в контексте семьи/близких
 * или при питомце с явной эмоцией в RU (`translationLikeLoveContext`).
 */
export function computeTranslationGoldVerdict(params: {
  userText: string
  goldEnglish: string
  ruPrompt: string
}): TranslationGoldVerdict {
  const { userText, goldEnglish, ruPrompt } = params
  const reasons: string[] = []

  const userTrim = userText.trim()
  const goldTrim = goldEnglish.trim()

  if (!goldTrim) {
    return { ok: false, reasons: ['empty_gold'] }
  }

  if (!userTrim) {
    return { ok: false, reasons: ['empty_answer'] }
  }

  if (CYRILLIC_RE.test(userTrim)) {
    return { ok: false, reasons: ['cyrillic_in_answer'] }
  }

  if (hasLikelyGibberishToken(userTrim)) {
    return { ok: false, reasons: ['gibberish_in_answer'] }
  }

  const goldNorm = normalizeForVerdictComparison(goldTrim)
  if (!goldNorm) {
    return { ok: false, reasons: ['gold_unnormalizable'] }
  }

  if (hasLikelyGibberishToken(goldTrim)) {
    return { ok: false, reasons: ['gibberish_in_gold'] }
  }

  if (!goldPlausibleForRuPrompt(ruPrompt, goldTrim)) {
    return { ok: false, reasons: ['gold_not_plausible_for_prompt'] }
  }

  if (!goldHasEnoughSubstanceForPrompt(ruPrompt, goldTrim)) {
    return { ok: false, reasons: ['gold_too_short_for_prompt'] }
  }

  const userNorm = normalizeForVerdictComparison(userTrim)
  if (userNorm === goldNorm) {
    return { ok: true, reasons: [] }
  }

  const userTokens = tokenizeForVerdictPrefixCheck(userNorm)
  const goldTokens = tokenizeForVerdictPrefixCheck(goldNorm)
  if (isStrictTokenPrefix(userTokens, goldTokens)) {
    return { ok: false, reasons: ['answer_incomplete'] }
  }
  if (isStrictTokenPrefixAllowingOneNominalNumberSlip(userTokens, goldTokens)) {
    return { ok: false, reasons: ['answer_incomplete'] }
  }

  if (allowsLikeLoveEquivalence(ruPrompt, goldTrim)) {
    for (const cand of likeLoveUserCandidates(userTrim)) {
      if (normalizeForVerdictComparison(cand) === goldNorm) {
        return { ok: true, reasons: [] }
      }
    }
  }

  reasons.push('gold_mismatch')
  return { ok: false, reasons }
}

/**
 * Эталон для вердикта: если скрытый ref и видимый «Скажи» расходятся, берём тот вариант,
 * с которым ответ пользователя проходит computeTranslationGoldVerdict; иначе приоритет как раньше (hidden, затем visible).
 */
export function pickTranslationGoldForVerdict(params: {
  assistantContent: string
  ruPrompt: string
  userText: string
}): string | null {
  const { hidden, visible } = getClampedHiddenAndVisibleGold(params.assistantContent, params.ruPrompt)
  const tp = params.ruPrompt.trim()
  const user = params.userText

  const candidates: string[] = []
  const pushDedup = (g: string | null | undefined) => {
    const t = g?.trim()
    if (!t) return
    const n = normalizeForVerdictComparison(t)
    if (!n) return
    if (!candidates.some((c) => normalizeForVerdictComparison(c) === n)) candidates.push(t)
  }
  pushDedup(hidden ?? undefined)
  pushDedup(visible ?? undefined)

  for (const gold of candidates) {
    const v = computeTranslationGoldVerdict({ userText: user, goldEnglish: gold, ruPrompt: tp })
    if (v.ok) return gold
  }
  return hidden?.trim() || visible?.trim() || null
}
