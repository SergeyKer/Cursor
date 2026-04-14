/**
 * Разбор и оформление «Комментарий:» в режиме перевода.
 * Следующий протокольный блок — не часть комментария (Время, Конструкция, Повтори, …).
 */
const TRANSLATION_PROTOCOL_LINE =
  /^\s*(Комментарий_ошибка|Комментарий_перевод|Ошибки|Время|Конструкция|Формы|Скажи|Повтори|Переведи(?:\s+далее)?|Следующ(?:ее|ие)?\s+предложени)\s*:/i

const TRANSLATION_COMMENT_LABEL_RE = /^\s*Комментарий(?:_ошибка)?\s*:\s*/i

export type TranslationCommentExtraction = {
  start: number
  endExclusive: number
  fullBody: string
}

/**
 * Собирает многострочный комментарий: первая строка «Комментарий: …» и строки до первого протокольного заголовка.
 */
export function extractTranslationCommentBlock(lines: string[]): TranslationCommentExtraction | null {
  const start = lines.findIndex((l) => TRANSLATION_COMMENT_LABEL_RE.test(l))
  if (start === -1) return null

  const afterPrefix = (lines[start] ?? '').replace(TRANSLATION_COMMENT_LABEL_RE, '')
  const splitFirst = afterPrefix.split(/\r?\n/)
  const fromFirst = splitFirst.map((s) => s.trimEnd())

  let end = start + 1
  const more: string[] = []
  while (end < lines.length) {
    const raw = lines[end] ?? ''
    if (TRANSLATION_PROTOCOL_LINE.test(raw)) break
    more.push(raw)
    end++
  }

  const allLines = [...fromFirst, ...more].filter((line, i, arr) => !(line === '' && i === 0 && arr.length > 1))
  const fullBody = allLines.join('\n').replace(/^\s+|\s+$/g, '')
  return { start, endExclusive: end, fullBody }
}

/** Убирает служебный префикс `Комментарий:` или `Комментарий_ошибка:` у диагностической строки. */
export function stripTranslationCommentLabel(text: string): string {
  return text.replace(TRANSLATION_COMMENT_LABEL_RE, '')
}

/** Классификация типа ошибки по тексту «Комментарий» (для синтеза блока «Ошибки:» и коуча). */
export function inferTranslationCommentErrorType(raw: string): string {
  return inferCommentErrorType(raw)
}

function inferCommentErrorType(raw: string): string {
  const s = raw.toLowerCase()
  // Русская лексика в английской фразе / «рус. → eng» — ошибка перевода, не «тип предложения».
  if (/['"`«]?[а-яё]{2,}['"`»]?\s*(?:→|->)\s*['"`«]?[a-z]{2,}/i.test(raw)) {
    return 'Ошибка перевода.'
  }
  if (/(?:вместо|instead\s+of)\s+['"`«]?[а-яё]{2,}/i.test(raw) && /[a-z]{3,}/i.test(raw)) {
    return 'Ошибка перевода.'
  }
  if (
    /типа?\s+предложения|вопросн\w*\s+(?:порядок|форма)|утвердител\w*\s+предложени|отрицател\w*\s+предложени/i.test(
      s
    )
  ) {
    return 'Ошибка типа предложения.'
  }
  // Иначе «Ошибка формы глагола» + «spelling» даёт ложный тип из-за подстроки «формы глагола».
  if (
    /(орфограф|spelling|опечат|неверн\w*\s+напис|правильн\w*\s+spelling|wrong\s+spelling|incorrect\s+spelling)/i.test(
      s
    )
  ) {
    return 'Орфографическая ошибка.'
  }
  if (/(врем|tense|present|past|future)/i.test(s)) return 'Ошибка времени.'
  if (/(согласован|agree|subject|подлежащ|has\b|have\b|does\b|do\b)/i.test(s)) {
    return 'Ошибка согласования подлежащего и сказуемого.'
  }
  if (/(форм[аы]\s+глагол|verb form|v1|v2|v3|неверн\w*\s+форм\w*\s+глагол)/i.test(s)) {
    return 'Ошибка формы глагола.'
  }
  if (/(лексическ|лексик|word choice|не то слово|неподходящее слово|словар)/i.test(s)) return 'Лексическая ошибка.'
  if (/(перевод\w*|translate|translation)/i.test(s)) return 'Ошибка перевода.'
  if (/(артикл|a\/an| a | an | the )/i.test(s)) return 'Ошибка употребления артикля.'
  if (/(предлог|preposition)/i.test(s)) return 'Ошибка в выборе предлога.'
  if (/(порядок слов|word order)/i.test(s)) return 'Ошибка порядка слов.'
  return 'Грамматическая ошибка.'
}

function spliceKommentariyBlock(lines: string[], start: number, endExclusive: number, newBody: string): string[] {
  const out = [...lines]
  const bodyLines = newBody.split(/\r?\n/)
  const inserted = [`Комментарий: ${bodyLines[0] ?? ''}`, ...bodyLines.slice(1)]
  out.splice(start, endExclusive - start, ...inserted)
  return out
}

/**
 * Подмешивает короткое пояснение после типа ошибки (нейтральное, без выдуманных сюжетов).
 */
export function applyTranslationCommentCoachVoice(params: {
  content: string
  audience: 'child' | 'adult'
  requiredTense: string
}): string {
  const { content, audience } = params
  if (!content) return content

  const lines = content.split(/\r?\n/)
  const extracted = extractTranslationCommentBlock(lines)
  if (!extracted) return content

  const { start, endExclusive, fullBody: commentText } = extracted
  if (!commentText) return content

  const errorType = inferCommentErrorType(commentText)
  const errorTypeClean = errorType.replace(/\.\s*$/, '')
  const errorTypeDisplay = errorTypeClean === 'Ошибка времени' ? '⏰ Ошибка времени' : errorTypeClean
  const commentTextLower = commentText.toLowerCase()
  const errorTypeLower = errorType.toLowerCase()
  const errorTypeLowerBase = errorTypeLower.endsWith('.') ? errorTypeLower.slice(0, -1) : errorTypeLower

  let prefixLen = -1
  if (commentTextLower.startsWith(errorTypeLower)) {
    prefixLen = errorType.length
  } else if (commentTextLower.startsWith(errorTypeLowerBase)) {
    prefixLen = errorTypeLowerBase.length
  }
  if (prefixLen === -1) return content

  const rest = commentText
    .slice(prefixLen)
    .trimStart()
    .replace(/^[:\-–—]\s*/, '')
    .replace(/^(Смотри|Смотрите)\s*[-–—:]\s*/i, '')

  if (!rest) {
    return spliceKommentariyBlock(lines, start, endExclusive, errorTypeDisplay).join('\n').trim()
  }

  if (errorTypeClean === 'Ошибка времени') {
    const timeReason =
      audience === 'child'
        ? 'проверь глагол по смыслу русской фразы из задания — подробно только в строке «Время:» ниже.'
        : 'выровняй английскую форму под смысл русской фразы из задания; название времени и полное объяснение — только в строке «Время:» ниже.'

    const head = `${errorTypeDisplay} — ${timeReason}`
    const newBody = rest.includes('\n') ? `${head}\n${rest.trim()}` : `${head} ${rest}`.replace(/\s{2,}/g, ' ').trim()
    return spliceKommentariyBlock(lines, start, endExclusive, newBody).join('\n').trim()
  }

  const newBody = rest.includes('\n')
    ? `${errorTypeDisplay} — ${rest.trimStart()}`
    : `${errorTypeDisplay} — ${rest}`.replace(/\s{2,}/g, ' ').trim()
  return spliceKommentariyBlock(lines, start, endExclusive, newBody).join('\n').trim()
}

/**
 * После метки «Ошибка типа предложения» вставляет обращение «Поправь» / «Поправьте» перед «вопрос должен…»,
 * если модель уже не написала это сама (строка «Комментарий:» или 🔤 в «Ошибки:»).
 */
export function injectSentenceTypePopravImperative(content: string, audience: 'child' | 'adult'): string {
  if (!content) return content
  const imperative = audience === 'child' ? 'Поправь' : 'Поправьте'
  return content.replace(
    /(Ошибка\s+типа\s+предложения)(\s*\.(?:\s*\*+)*\s*|\s*:\s*)(?!\s*Поправь(?:те)?\s*[—–-]\s*)(вопрос\s+должен[^\n]*)/gi,
    (_, label: string, sep: string, rest: string) => `${label}${sep}${imperative} — ${rest}`
  )
}
