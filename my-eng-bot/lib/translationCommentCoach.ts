/**
 * Разбор и оформление «Комментарий:» в режиме перевода.
 * Следующий протокольный блок — не часть комментария (Время, Конструкция, Повтори, …).
 */
const TRANSLATION_PROTOCOL_LINE =
  /^\s*(Ошибки|Время|Конструкция|Формы|Повтори|Переведи(?:\s+далее)?|Следующ(?:ее|ие)?\s+предложени)\s*:/i

export type TranslationCommentExtraction = {
  start: number
  endExclusive: number
  fullBody: string
}

/**
 * Собирает многострочный комментарий: первая строка «Комментарий: …» и строки до первого протокольного заголовка.
 */
export function extractTranslationCommentBlock(lines: string[]): TranslationCommentExtraction | null {
  const start = lines.findIndex((l) => /^\s*Комментарий\s*:/i.test(l))
  if (start === -1) return null

  const afterPrefix = (lines[start] ?? '').replace(/^\s*Комментарий\s*:\s*/i, '')
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

function inferCommentErrorType(raw: string): string {
  const s = raw.toLowerCase()
  if (/(врем|tense|present|past|future)/i.test(s)) return 'Ошибка времени.'
  if (/(согласован|agree|subject|подлежащ|has\b|have\b|does\b|do\b)/i.test(s)) {
    return 'Ошибка согласования подлежащего и сказуемого.'
  }
  if (/(форм[аы]\s+глагол|verb form|v1|v2|v3|неверн\w*\s+форм\w*\s+глагол)/i.test(s)) {
    return 'Ошибка формы глагола.'
  }
  if (/(лексическ|лексик|word choice|не то слово|неподходящее слово|словар)/i.test(s)) return 'Лексическая ошибка.'
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
  const { content, audience, requiredTense } = params
  if (!content) return content

  const lines = content.split(/\r?\n/)
  const extracted = extractTranslationCommentBlock(lines)
  if (!extracted) return content

  const { start, endExclusive, fullBody: commentText } = extracted
  if (!commentText) return content

  const errorType = inferCommentErrorType(commentText)
  const errorTypeClean = errorType.replace(/\.\s*$/, '')
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
    return spliceKommentariyBlock(lines, start, endExclusive, errorTypeClean).join('\n').trim()
  }

  if (errorTypeClean === 'Ошибка времени') {
    let timeReason =
      audience === 'child'
        ? 'нужно время из задания.'
        : 'важно выбрать время по смыслу фразы из задания.'
    switch (requiredTense) {
      case 'present_simple':
        timeReason =
          audience === 'child'
            ? 'это привычка или факт — скажи в настоящем времени.'
            : 'здесь нужен Present Simple: привычка, факт или постоянное состояние в настоящем.'
        break
      case 'present_continuous':
        timeReason =
          audience === 'child'
            ? 'действие сейчас — используй форму с -ing.'
            : 'здесь уместно Present Continuous, если речь о процессе сейчас.'
        break
      case 'past_simple':
        timeReason =
          audience === 'child'
            ? 'это уже было — используй Past Simple.'
            : 'здесь речь о завершённом действии или факте в прошлом — Past Simple.'
        break
      default:
        break
    }

    const head = `${errorTypeClean} — ${timeReason}`
    const newBody = rest.includes('\n') ? `${head}\n${rest.trim()}` : `${head} ${rest}`.replace(/\s{2,}/g, ' ').trim()
    return spliceKommentariyBlock(lines, start, endExclusive, newBody).join('\n').trim()
  }

  const newBody = rest.includes('\n')
    ? `${errorTypeClean} — ${rest.trimStart()}`
    : `${errorTypeClean} — ${rest}`.replace(/\s{2,}/g, ' ').trim()
  return spliceKommentariyBlock(lines, start, endExclusive, newBody).join('\n').trim()
}
