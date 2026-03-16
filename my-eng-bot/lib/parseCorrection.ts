export function parseCorrection(text: string): {
  correction: string | null
  comment: string | null
  rest: string
} {
  const cleaned = text
    // вырезаем все сырые маркеры Markdown, если модель всё же их вернула
    .replace(/\*\*(Correction|Comment|Right|Praise):\*\*/gi, '')
    .trim()

  const lines = cleaned.split(/\r?\n/)
  let correction: string | null = null
  let comment: string | null = null
  const restLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) {
      // пустую строку просто переносим в rest, структура вопроса сохраняется
      restLines.push(raw)
      continue
    }
    if (line.toLowerCase().startsWith('правильно:')) {
      if (correction === null) {
        correction = line.slice('правильно:'.length).trim()
        continue
      }
    }
    if (line.toLowerCase().startsWith('комментарий:')) {
      if (comment === null) {
        comment = line.slice('комментарий:'.length).trim()
        continue
      }
    }
    restLines.push(raw)
  }

  // Пользователь часто диктует ответы голосом: не показываем "замечания" про заглавные буквы.
  if (comment && /(заглавн|capital letter|capitalization)/i.test(comment)) {
    comment = null
  }

  const rest = restLines.join('\n').trim()
  return {
    correction: correction || null,
    comment: comment || null,
    rest: rest || cleaned,
  }
}

type SegmentResult = {
  value: string
  rest: string
}

const MARKERS = ['**Praise:**', '**Correction:**', '**Right:**', '**Comment:**'] as const

function takeUntilNextMarker(source: string): SegmentResult {
  const text = source.trimStart()
  let nearestIndex = -1

  for (const marker of MARKERS) {
    const idx = text.indexOf(marker)
    if (idx !== -1 && (nearestIndex === -1 || idx < nearestIndex)) {
      nearestIndex = idx
    }
  }

  if (nearestIndex === -1) {
    return {
      value: text.trim(),
      rest: '',
    }
  }

  const value = text.slice(0, nearestIndex).trim()
  const rest = text.slice(nearestIndex).trimStart()

  return { value, rest }
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
