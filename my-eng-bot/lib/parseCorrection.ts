/**
 * Извлекает блок **Correction:** и при наличии **Comment:** из ответа ассистента.
 * Возвращает { correction, comment, rest } для отдельного отображения.
 */
export function parseCorrection(text: string): {
  correction: string | null
  comment: string | null
  rest: string
} {
  const marker = '**Correction:**'
  const idx = text.indexOf(marker)
  if (idx === -1) {
    return { correction: null, comment: null, rest: text.trim() }
  }
  const afterMarker = text.slice(idx + marker.length).trim()
  let firstParagraph = afterMarker.split(/\n\n/)[0]?.trim() ?? ''
  let afterBlock = afterMarker.slice(firstParagraph.length).replace(/^\n\n?/, '').trim()

  firstParagraph = firstParagraph.replace(/\s*\*\*Correction:\*\*[\s\S]*$/i, '').trim()

  const questionStart = firstParagraph.match(/\s+(What|Where|When|Which|Who|Did you|Have you|Do you|Is there|Can you|Was it|How many)\s+/i)
  if (questionStart && questionStart.index !== undefined && questionStart.index > 0) {
    const questionPart = firstParagraph.slice(questionStart.index).trim()
    firstParagraph = firstParagraph.slice(0, questionStart.index).trim()
    afterBlock = (questionPart + (afterBlock ? '\n\n' + afterBlock : '')).trim()
  }

  let comment: string | null = null
  const commentMarker = '**Comment:**'
  if (firstParagraph.includes(commentMarker)) {
    const cIdx = firstParagraph.indexOf(commentMarker)
    const afterC = firstParagraph.slice(cIdx + commentMarker.length).trim()
    const { value: commentVal, rest: afterComment } = takeUntilNextMarker(afterC)
    const firstSentence = commentVal?.match(/^[^.!?]*[.!?]/)?.[0]?.trim() ?? commentVal
    if (firstSentence) comment = firstSentence
    firstParagraph = firstParagraph.slice(0, cIdx).trim()
    const remainder = (commentVal?.slice(firstSentence?.length ?? 0).trim() || afterComment).trim()
    if (remainder) afterBlock = (remainder + (afterBlock ? '\n\n' + afterBlock : '')).trim()
  }
  if (afterBlock.includes(commentMarker) && !comment) {
    const cIdx = afterBlock.indexOf(commentMarker)
    const afterC = afterBlock.slice(cIdx + commentMarker.length).trim()
    const { value: commentVal, rest: afterComment } = takeUntilNextMarker(afterC)
    comment = commentVal || null
    afterBlock = (afterBlock.slice(0, cIdx).trim() + (afterComment ? '\n\n' + afterComment : '')).trim()
  }

  let rest = (text.slice(0, idx).trim() + (afterBlock ? '\n\n' + afterBlock : '')).trim()
  rest = rest.replace(/\*\*Correction:\*\*[\s\S]*$/i, '').trim()
  rest = rest.replace(/\*\*Правильно:\*\*[\s\S]*$/i, '').trim()
  rest = rest.replace(/\*\*Comment:\*\*[^\n]+/gi, '').trim()
  rest = rest.replace(/(^\s*|\n\s*)Правильно:\s*[^\n]+/gi, '').trim()
  rest = rest.replace(/(^\s*|\n\s*)Комментарий:\s*[^\n]+/gi, '').trim()
  return {
    correction: firstParagraph || null,
    comment,
    rest: rest || text.trim(),
  }
}

/** Текст до следующего маркера **Word:**; rest — всё после маркера */
function takeUntilNextMarker(s: string): { value: string; rest: string } {
  s = s.trim()
  const match = s.match(/\s*\*\*[A-Za-z]+:\*\*\s*/)
  if (match && match.index !== undefined) {
    const value = s.slice(0, match.index).trim()
    const rest = s.slice(match.index + match[0].length).trim()
    return { value, rest }
  }
  return { value: s, rest: '' }
}

/**
 * Разбор ответа ИИ в режиме «Тренировка перевода»:
 * **Praise:** или **Correction:** **Right:** **Comment:** + следующий русский текст и приглашение.
 */
export function parseTranslationFeedback(text: string): {
  praise: string | null
  correction: string | null
  right: string | null
  comment: string | null
  nextSentence: string
  invitation: string | null
} {
  let praise: string | null = null
  let correction: string | null = null
  let right: string | null = null
  let comment: string | null = null
  let rest = text.trim()
  let invitation: string | null = null

  if (rest.includes('**Praise:**')) {
    const idx = rest.indexOf('**Praise:**')
    const after = rest.slice(idx + '**Praise:**'.length)
    const { value, rest: r } = takeUntilNextMarker(after)
    praise = value || null
    rest = r
  } else if (rest.includes('**Correction:**')) {
    const idx = rest.indexOf('**Correction:**')
    let after = rest.slice(idx + '**Correction:**'.length)
    const { value: cor, rest: r1 } = takeUntilNextMarker(after)
    correction = cor || null
    after = r1
    if (after.includes('**Right:**')) {
      const ri = after.indexOf('**Right:**')
      after = after.slice(ri + '**Right:**'.length)
      const { value: rt, rest: r2 } = takeUntilNextMarker(after)
      right = rt || null
      after = r2
    }
    if (after.includes('**Comment:**')) {
      const ci = after.indexOf('**Comment:**')
      after = after.slice(ci + '**Comment:**'.length)
      const { value: com, rest: r3 } = takeUntilNextMarker(after)
      comment = com || null
      rest = r3
    } else {
      rest = after
    }
  }

  const invitationMatch = rest.match(/\s+((?:Переведи|Переведите)[^.]*\.)\s*$/i)
  const nextSentence = invitationMatch ? rest.slice(0, rest.length - invitationMatch[0].length).trimEnd() : rest
  if (invitationMatch) invitation = invitationMatch[1].trim()
  return { praise, correction, right, comment, nextSentence, invitation }
}
