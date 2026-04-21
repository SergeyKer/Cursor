import { clampTranslationRepeatToRuPrompt, normalizeRepeatSentenceEnding } from '@/lib/translationRepeatClamp'

const RU_PREFERENCE_LIKE_RE =
  /не\s+люблю|люблю|мне\s+нрав(?:ит(?:ся)?|ятся)|тебе\s+нрав(?:ит(?:ся)?|ятся)|ему\s+нрав(?:ит(?:ся)?|ятся)|ей\s+нрав(?:ит(?:ся)?|ятся)|нам\s+нрав(?:ит(?:ся)?|ятся)|вам\s+нрав(?:ит(?:ся)?|ятся)|им\s+нрав(?:ит(?:ся)?|ятся)/i

function preserveWordCase(source: string, replacement: string): string {
  if (source.toUpperCase() === source) return replacement.toUpperCase()
  if (source[0] && source[0] === source[0].toUpperCase()) {
    return `${replacement[0]?.toUpperCase() ?? ''}${replacement.slice(1)}`
  }
  return replacement
}

const ENJOY_TO_LIKE_FORMS: Readonly<Record<string, string>> = {
  enjoy: 'like',
  enjoys: 'likes',
  enjoyed: 'liked',
  enjoying: 'liking',
}

export function shouldPreferLikeOverEnjoyForRuPrompt(ruPrompt: string | null | undefined): boolean {
  const ru = ruPrompt?.trim() ?? ''
  if (!ru) return false
  return RU_PREFERENCE_LIKE_RE.test(ru)
}

export function preferLikeOverEnjoyByRuPrompt(goldEnglish: string, ruPrompt: string | null | undefined): string {
  if (!shouldPreferLikeOverEnjoyForRuPrompt(ruPrompt)) return goldEnglish
  return goldEnglish.replace(/\benjoy(?:s|ed|ing)?\b/gi, (hit) => {
    const lower = hit.toLowerCase()
    const replacement = ENJOY_TO_LIKE_FORMS[lower] ?? 'like'
    return preserveWordCase(hit, replacement)
  })
}

export function normalizeTranslationCanonicalGold(params: {
  goldEnglish: string
  ruPrompt: string | null | undefined
}): string {
  const gold = params.goldEnglish.replace(/\s+/g, ' ').trim()
  if (!gold) return ''
  const ru = params.ruPrompt?.trim() ?? ''
  const { clamped } = clampTranslationRepeatToRuPrompt(gold, ru)
  const promptAligned = (clamped?.trim() || gold) || ''
  if (!promptAligned) return ''
  const lexiconAligned = preferLikeOverEnjoyByRuPrompt(promptAligned, ru)
  return normalizeRepeatSentenceEnding(lexiconAligned)
}
