import type { Audience, LevelId } from '@/lib/types'

function splitEnglishSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isGenericEnglishClarification(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (!t) return false
  return [
    /could you clarify/i,
    /could you explain what you mean/i,
    /what do you mean/i,
    /can you say it another way/i,
    /please clarify/i,
  ].some((re) => re.test(t))
}

function isFactualSentence(sentence: string): boolean {
  return /\d/.test(sentence) || /\b(?:today|yesterday|this week|this month|released|update|patch|game|studio)\b/i.test(sentence)
}

export function buildSimpleNewsFactualFallback(params: {
  draft: string
  audience: Audience
  level: LevelId
}): string {
  const sentences = splitEnglishSentences(params.draft)
  const factual = sentences.filter((s) => isFactualSentence(s) && s.split(/\s+/).length <= 16)
  const picked = factual.slice(0, 2)
  if (picked.length > 0) return picked.join(' ')

  const low = ['starter', 'a1', 'a2'].includes(params.level)
  if (params.audience === 'child') {
    return low
      ? 'I found game news. There are new updates this week.'
      : 'I found game news. There are new game updates this week.'
  }
  return low
    ? 'I found game news. There are new updates this week.'
    : 'I found game news. There are new game updates this week.'
}
