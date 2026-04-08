export function parseCorrection(text: string): {
  comment: string | null
  rest: string
} {
  const cleaned = text
    // вырезаем все сырые маркеры Markdown, если модель всё же их вернула
    .replace(/\*\*(Correction|Comment|Right|Praise):\*\*/gi, '')
    .trim()

  const lines = cleaned.split(/\r?\n/)
  let comment: string | null = null
  const restLines: string[] = []
  let collectingComment = false

  function stripAssistantPrefix(rawLine: string): string {
    // Модель иногда сама добавляет префиксы "AI:"/"Assistant:" — чтобы не ломать разбор.
    return rawLine.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '')
  }

  function splitInlineRepeat(source: string): { comment: string | null; repeat: string | null } {
    const trimmed = source.trim()
    const match = trimmed.match(/^(.*?)(?:\s+(?:Повтори|Repeat|Say)\s*:\s*)([\s\S]+)$/i)
    if (!match) return { comment: trimmed || null, repeat: null }

    const commentPart = match[1]?.trim() || null
    const repeatPart = match[2]?.trim() || null
    if (!repeatPart) return { comment: trimmed || null, repeat: null }

    return {
      comment: commentPart,
      repeat: `Повтори: ${repeatPart}`,
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = stripAssistantPrefix(raw).trim()
    if (!line) {
      // пустую строку просто переносим в rest, структура вопроса сохраняется
      if (collectingComment && comment !== null) {
        comment += '\n'
        continue
      }
      restLines.push(raw)
      continue
    }
    // "Правильно:" больше не используем в UI; если вдруг просочилось — пропускаем.
    if (line.toLowerCase().startsWith('правильно:')) continue
    if (line.toLowerCase().startsWith('комментарий:')) {
      if (comment === null) {
        comment = line.slice('комментарий:'.length).trim()
        collectingComment = true
        continue
      }
    }
    if (collectingComment) {
      const isNextHeader =
        /^время\s*:/i.test(line) ||
        /^(повтори|repeat|say)\s*:/i.test(line) ||
        /^конструкция\s*:/i.test(line) ||
        /^формы\s*:/i.test(line) ||
        /^\s*(?:\d+\)\s*)?(?:переведи|переведите)\b/i.test(line)
      if (!isNextHeader) {
        comment = comment ? `${comment}\n${line}` : line
        continue
      }
      collectingComment = false
    }
    // В rest пишем уже нормализованную строку, чтобы не показывать "AI:" в UI.
    restLines.push(stripAssistantPrefix(raw))
  }

  // Пользователь часто диктует ответы голосом: не показываем "замечания" про заглавные буквы.
  if (comment && /(заглавн|capital letter|capitalization)/i.test(comment)) {
    comment = null
  }

  // Пользователь часто диктует ответы голосом: модель иногда всё равно упоминает запятые в "Комментарий".
  // Уберем упоминания про пунктуацию, чтобы правило "не смотреть на запятые" работало на UI.
  if (comment && /(запят(?:ую|ые)|знаки\s+препинания|пунктуац|comma)/i.test(comment)) {
    const original = comment.trim()
    const punctTail = /[.!?]\s*$/.exec(original)?.[0] ?? ''

    // Типовой случай: "Нужно добавить запятые и исправить 'work' на 'walk'."
    // Берем часть после "и" (после упоминания запятых) и оставляем остальное.
    const m = original.match(/запят(?:ую|ые)[^.!?]*\sи\s(.+?)\s*([.!?])?\s*$/i)
    if (m?.[1]?.trim()) {
      let candidate = m[1].trim()
      if (!/[.!?]\s*$/.test(candidate) && punctTail) candidate += punctTail
      // На всякий случай: если в результате снова остались слова про запятые — скрываем комментарий.
      if (!/(запят(?:ую|ые)|знаки\s+препинания|пунктуац|comma)/i.test(candidate)) {
        comment = candidate
      } else {
        comment = null
      }
    } else {
      // Если структура не распознана — лучше скрыть "Комментарий", чем показывать пунктуацию.
      comment = null
    }
  }

  // Иногда модель добавляет "Правильный вариант: ...", но UI уже использует отдельный алгоритм "Повтори".
  // Убираем "Правильный вариант" из блока "Комментарий", чтобы не было дублирования.
  if (comment) {
    const parts = comment.split(/правильн(?:ый)?\s+вариант\s*:\s*/i)
    if (parts.length > 1) {
      comment = parts[0].trim() || null
    }
  }

  let repeatLine: string | null = null
  if (comment) {
    const split = splitInlineRepeat(comment)
    comment = split.comment
    repeatLine = split.repeat
  }

  // Если это похвала (русское "Отлично/Молодец/..." в начале), а модель всё равно дописала
  // английский хвост в той же строке, убираем хвост. При этом "Возможный вариант" может
  // содержать английскую фразу, поэтому его не трогаем.
  if (comment) {
    const isPraise =
      /^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)\b\s*[!.]?\s*/i.test(comment)
    const hasAltVariant = /(Возможный\s+вариант|Вариант)\s*:/i.test(comment)
    if (isPraise && !hasAltVariant && /[A-Za-z]/.test(comment)) {
      const idx = comment.search(/[A-Za-z]/)
      const candidate = comment.slice(0, idx).trim()
      comment = candidate || null
    }
  }

  let rest = restLines.join('\n').trim()
  if (repeatLine) {
    // Если "Повтори" был спрятан внутри комментария, показываем его отдельной строкой
    // и не оставляем следующий вопрос в этом же блоке.
    rest = repeatLine
  }
  // Если комментарий — только похвала, но в той же строке модель дописала следующий вопрос (без перевода строки),
  // выносим вопрос в rest, чтобы он отображался в блоке «AI: вопрос».
  const praiseThenRest = comment?.match(/^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)[!.]?\s+([\s\S]+)$/)
  if (praiseThenRest && !rest) {
    const [, praiseWord, tail] = praiseThenRest
    const tailTrim = (tail as string).trim()
    if (tailTrim.length > 0) {
      comment = `${praiseWord}!`
      rest = tailTrim
    }
  }

  return {
    comment: comment || null,
    // Если мы уже извлекли «Комментарий:», то не должны повторно показывать
    // исходный текст (иначе получится дублирование «Комментарий/Повтори» в UI).
    rest: (comment ? rest : rest || cleaned) || '',
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
 * Разбор ответа ИИ в режиме «Перевод»:
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
