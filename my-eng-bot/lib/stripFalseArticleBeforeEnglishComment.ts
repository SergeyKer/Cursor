/**
 * Если в «Повтори» нет артикля перед English (study English, I studied English — норма),
 * убираем из «Комментарий» вводящие в заблуждение фразы про добавление the перед English.
 */

function repeatHasArticleBeforeEnglish(repeatLower: string): boolean {
  return /\b(a|an|the)\s+english\b/i.test(repeatLower)
}

export function stripFalseArticleBeforeEnglishComment(commentText: string, repeatText: string): string {
  const repeatLower = repeatText.toLowerCase()
  if (!/\benglish\b/i.test(repeatLower)) return commentText
  if (repeatHasArticleBeforeEnglish(repeatLower)) return commentText

  let t = commentText

  t = t.replace(
    /\.\s+(Также|также)\s+[^.]*(?:добав(ить|ь)|нужно\s+добавить)[^.]*(?:«|"|')?the(?:»|"|')?[^.]*English[^.]*\./gi,
    '.',
  )

  t = t.replace(
    /[;,]\s*(?:нужно\s+)?добав(ить|ь)[^.]*(?:«|"|')?the(?:»|"|')?[^.]*перед[^.]*English[^.]*\./gi,
    '.',
  )

  t = t.replace(/\s{2,}/g, ' ').trim()
  t = t.replace(/\.\s*\./g, '.')
  t = t.replace(/^,\s*/g, '')
  if (t.length < 8) return commentText
  return t
}
