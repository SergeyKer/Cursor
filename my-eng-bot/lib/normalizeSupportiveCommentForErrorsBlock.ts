export function normalizeSupportiveCommentForErrorsBlock(rawSupport: string, audience: 'child' | 'adult'): string {
  const compact = rawSupport.replace(/\s+/g, ' ').trim()
  if (!compact) {
    return audience === 'child' ? 'Хорошее начало.' : 'Хорошее начало.'
  }

  const firstSentenceMatch = compact.match(/^[^.!?]+[.!?]?/)
  let firstSentence = (firstSentenceMatch?.[0] ?? compact).trim()
  firstSentence = firstSentence.replace(/\s+/g, ' ')
  firstSentence = firstSentence.replace(/[.!?]\s*$/, '.').trim()
  if (!firstSentence) firstSentence = 'Хорошее начало.'
  return firstSentence
}
