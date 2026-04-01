/**
 * Выравнивает русский «Комментарий» с «Повтори», если модель перепутала is/are в формулировке объяснения.
 */
export function alignDialogueBeVerbCommentWithRepeat(content: string): string {
  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  const repeatLine = lines.find((line) => /^(?:\s*)(Повтори|Repeat|Say)\s*:/i.test(line.trim()))
  if (commentIndex === -1 || !repeatLine) return content

  const commentText = lines[commentIndex].replace(/^Комментарий\s*:\s*/i, '').trim()
  const repeatText = repeatLine.replace(/^(?:\s*)(Повтори|Repeat|Say)\s*:\s*/i, '').trim()
  if (!commentText || !repeatText) return content

  const repeatUsesPluralAre =
    /\b(they|we|you)\s+('?re|are)\b/i.test(repeatText) ||
    /\bthere\s+are\b/i.test(repeatText)

  const repeatUsesSingularIs =
    /\b(he|she|it)\s+('?s|is)\b/i.test(repeatText) && !/\b(he|she|it)\s+are\b/i.test(repeatText)

  let next = commentText

  if (repeatUsesPluralAre) {
    next = next.replace(/\bis\s+вместо\s+are\b/gi, 'are вместо is')
    next = next.replace(/использовать\s+is\s+вместо\s+are/gi, 'использовать are вместо is')
    next = next.replace(/нужно\s+использовать\s+is\s+вместо\s+are/gi, 'нужно использовать are вместо is')
  }

  if (repeatUsesSingularIs) {
    next = next.replace(/\bare\s+вместо\s+is\b/gi, 'is вместо are')
    next = next.replace(/использовать\s+are\s+вместо\s+is/gi, 'использовать is вместо are')
  }

  if (next === commentText) return content

  lines[commentIndex] = `Комментарий: ${next}`
  return lines.join('\n').trim()
}
