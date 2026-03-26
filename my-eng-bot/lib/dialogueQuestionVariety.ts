export function normalizeQuestionForCompare(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s?]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function isNearDuplicateQuestion(prevQuestion: string | null, nextQuestion: string): boolean {
  if (!prevQuestion) return false
  const prev = normalizeQuestionForCompare(prevQuestion)
  const next = normalizeQuestionForCompare(nextQuestion)
  if (!prev || !next) return false
  if (prev === next) return true

  const tokenize = (s: string): string[] =>
    s.replace(/\?/g, '').split(/\s+/).filter((w) => w.length > 2)
  const prevTokens = new Set(tokenize(prev))
  const nextTokens = new Set(tokenize(next))
  if (prevTokens.size === 0 || nextTokens.size === 0) return false

  let overlap = 0
  Array.from(prevTokens).forEach((token) => {
    if (nextTokens.has(token)) overlap++
  })
  const union = new Set([...Array.from(prevTokens), ...Array.from(nextTokens)]).size
  const jaccard = union > 0 ? overlap / union : 0
  return jaccard >= 0.75
}
