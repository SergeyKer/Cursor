/**
 * Извлекает блок **Correction:** из ответа ассистента для отдельного отображения.
 * Возвращает { correction: string | null, rest: string }.
 */
export function parseCorrection(text: string): {
  correction: string | null
  rest: string
} {
  const marker = '**Correction:**'
  const idx = text.indexOf(marker)
  if (idx === -1) {
    return { correction: null, rest: text.trim() }
  }
  const afterMarker = text.slice(idx + marker.length).trim()
  const firstParagraph = afterMarker.split(/\n\n/)[0]?.trim() ?? ''
  const afterBlock = afterMarker.slice(firstParagraph.length).replace(/^\n\n?/, '').trim()
  const rest = (text.slice(0, idx).trim() + (afterBlock ? '\n\n' + afterBlock : '')).trim()
  return {
    correction: firstParagraph || null,
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
