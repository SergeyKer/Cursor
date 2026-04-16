export function normalizeSupportiveCommentForErrorsBlock(rawSupport: string, audience: 'child' | 'adult'): string {
  const compact = rawSupport.replace(/\s+/g, ' ').trim()
  if (!compact) {
    return audience === 'child' ? 'Есть хорошая основа.' : 'Есть хорошая основа.'
  }

  const firstSentenceMatch = compact.match(/^[^.!?]+[.!?]?/)
  let firstSentence = (firstSentenceMatch?.[0] ?? compact).trim()
  firstSentence = firstSentence.replace(/\s+/g, ' ')
  firstSentence = firstSentence.replace(/[.!?]\s*$/, '.').trim()
  if (!firstSentence) firstSentence = 'Есть хорошая основа.'
  return firstSentence
}
