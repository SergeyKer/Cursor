import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import { normalizeEnglishForRepeatMatch } from '@/lib/normalizeEnglishForRepeatMatch'

export type TranslationGoldVerdict = {
  ok: boolean
  reasons: string[]
}

function normalizeForVerdictComparison(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  return normalizeEnglishForRepeatMatch(normalizeEnglishLearnerContractions(compact))
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

const CYRILLIC_RE = /[\u0400-\u04FF]/

/** RU или EN намёк на питомца — оба варианта like/love допустимы (как в likeLoveTutorPrompt). */
function isPetLikeLoveContext(ruPrompt: string, goldEnglish: string): boolean {
  const ru = ruPrompt.trim()
  const g = goldEnglish.trim()
  if (/собак|кошк|кот[а-яё]*|пёс|пес|щенк|щенят|котён|котен/i.test(ru)) return true
  if (/\b(my|your|her|his|our|their)\s+(dog|cat|puppy|kitten|pet)s?\b/i.test(g)) return true
  return false
}

function petLikeLoveUserCandidates(user: string): string[] {
  const seen = new Set<string>()
  const add = (s: string) => {
    const t = s.trim()
    if (t) seen.add(t)
  }
  add(user)
  if (/\blove\b/i.test(user)) add(user.replace(/\blove\b/gi, 'like'))
  if (/\blike\b/i.test(user)) add(user.replace(/\blike\b/gi, 'love'))
  return [...seen]
}

/**
 * Строгий вердикт: ответ засчитывается только если совпадает с эталоном после узкой нормализации
 * (сокращения + регистр + пунктуация + compound words), либо в контексте питомца — пара like/love.
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

  const goldNorm = normalizeForVerdictComparison(goldTrim)
  if (!goldNorm) {
    return { ok: false, reasons: ['gold_unnormalizable'] }
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

  if (isPetLikeLoveContext(ruPrompt, goldTrim)) {
    for (const cand of petLikeLoveUserCandidates(userTrim)) {
      if (normalizeForVerdictComparison(cand) === goldNorm) {
        return { ok: true, reasons: [] }
      }
    }
  }

  reasons.push('gold_mismatch')
  return { ok: false, reasons }
}
