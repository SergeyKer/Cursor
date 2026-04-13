import { inferTranslationCommentErrorType } from '@/lib/translationCommentCoach'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Эмодзи-строка для блока «Ошибки:» по типу из inferTranslationCommentErrorType. */
function mapErrorTypeToSyntheticLinePrefix(inferredType: string): string {
  const t = inferredType.toLowerCase()
  // Keep tense explanation only on standalone "Время:" line in protocol.
  // Synthetic fallback for comment-derived issues must stay inside "Ошибки:" labels.
  if (t.includes('времени')) return '🔤 Грамматика:'
  if (t.includes('лексическ')) return '📖 Лексика:'
  return '🔤 Грамматика:'
}

/**
 * Убирает из начала комментария уже озвученный тип ошибки, чтобы не дублировать его в «Ошибки».
 */
function stripLeadingErrorTypePhrase(body: string, inferredType: string): string {
  const trimmed = body.trim()
  const withDot = inferredType.endsWith('.') ? inferredType : `${inferredType}.`
  const withoutDot = inferredType.replace(/\.\s*$/, '')

  for (const head of [withDot, withoutDot, inferredType]) {
    const re = new RegExp(`^${escapeRegExp(head)}\\s*[—:\\-–]\\s*`, 'i')
    if (re.test(trimmed)) return trimmed.replace(re, '').trim()
  }

  const commonHeads = [
    /^лексическая\s+ошибка\s*[—:\\-–]\s*/i,
    /^грамматическая\s+ошибка\s*[—:\\-–]\s*/i,
    /^ошибка\s+времени\s*[—:\\-–]\s*/i,
    /^ошибка\s+лексики\s*[—:\\-–]\s*/i,
    /^ошибка\s+артикл\w*\s*[—:\\-–]\s*/i,
  ]
  let out = trimmed
  for (const re of commonHeads) {
    if (re.test(out)) {
      out = out.replace(re, '').trim()
      break
    }
  }
  return out
}

/**
 * Одна-две строки для блока «Ошибки:», если модель не вывела секцию сама.
 * Не дублирует заголовок типа: деталь — хвост комментария.
 */
export function buildSyntheticErrorsBlockFromComment(commentBody: string): string | null {
  const trimmed = commentBody.replace(/^\s+|\s+$/g, '')
  if (!trimmed) return null
  if (/^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)(?:[\s!,.?:;"'»)]|$)/i.test(trimmed)) {
    return null
  }

  const inferred = inferTranslationCommentErrorType(trimmed)
  const prefix = mapErrorTypeToSyntheticLinePrefix(inferred)
  const detail = stripLeadingErrorTypePhrase(trimmed, inferred)
  const text = (detail || trimmed).replace(/\s+/g, ' ').trim()
  if (!text) return null
  return `${prefix} ${text}`.trim()
}

function normalizeErrorsBlockForDedup(s: string): string {
  return s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

function extractCorrectionPairSignature(s: string): string | null {
  const text = s.toLowerCase()
  const pairMatch =
    text.match(/["'«»“”`]?([a-zа-яё0-9]+)["'«»“”`]?\s*(?:→|->|\bto\b|=)\s*["'«»“”`]?([a-zа-яё0-9]+)["'«»“”`]?/i) ??
    text.match(/([a-zа-яё0-9]+)\s*→\s*([a-zа-яё0-9]+)/i)
  if (pairMatch?.[1] && pairMatch[2]) {
    return `${pairMatch[1]}=>${pairMatch[2]}`
  }
  return null
}

function extractCoreErrorSignature(s: string): string {
  return s
    .toLowerCase()
    .replace(/^[🔤📖✏️🤔⏱️]+\s*/g, '')
    .replace(/^(грамматика|лексика|орфография|ошибка времени|ошибка формы глагола|ошибка типа предложения)\s*:\s*/i, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractArticleSignature(s: string): string | null {
  const text = s.toLowerCase()
  const articleMention =
    text.match(/\b(a|an|the)\b\s+([a-zа-яё0-9]{3,})/i) ??
    text.match(/([a-zа-яё0-9]{3,})\s*(?:requires|needs|need|take|takes)?\s*(?:an?\s+|the\s+)?article/i) ??
    text.match(/(?:before|перед)\s+([a-zа-яё0-9]{3,})\b/i)

  if (articleMention?.[1] && articleMention[2]) {
    const article = articleMention[1].toLowerCase()
    const noun = articleMention[2].toLowerCase()
    return `article:${article}:${noun}`
  }

  if (articleMention?.[1]) {
    return `article::${articleMention[1].toLowerCase()}`
  }

  return null
}

function tokenizeMeaningfulWords(s: string): string[] {
  return extractCoreErrorSignature(s)
    .split(' ')
    .filter((word) => word.length >= 3)
}

function looksLikeDuplicateErrorLine(a: string, b: string): boolean {
  const aCore = extractCoreErrorSignature(a)
  const bCore = extractCoreErrorSignature(b)
  if (!aCore || !bCore) return false
  if (aCore === bCore) return true

  const aArticle = extractArticleSignature(a)
  const bArticle = extractArticleSignature(b)
  if (aArticle && bArticle && aArticle === bArticle) return true

  const aPair = extractCorrectionPairSignature(a)
  const bPair = extractCorrectionPairSignature(b)
  if (aPair && bPair && aPair === bPair) return true

  const aTokens = new Set(tokenizeMeaningfulWords(a))
  const bTokens = new Set(tokenizeMeaningfulWords(b))
  if (aTokens.size === 0 || bTokens.size === 0) return false

  let overlap = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap++
  }

  const minSize = Math.min(aTokens.size, bTokens.size)
  return minSize > 0 && overlap / minSize >= 0.6
}

function hasErrorLabelPrefix(line: string): boolean {
  return /^\s*(🔤|📖|✏️|🤔|⏱️)\s+/.test(line)
}

function inferStructuredErrorPrefix(line: string): string {
  const text = line.toLowerCase()
  if (/(артикл| a\b| an\b| the\b|article)/i.test(text)) return '🔤 Грамматика:'
  if (/(лексическ|word choice|wrong word|не то слово|словар)/i.test(text)) return '📖 Лексика:'
  if (/(орфограф|spelling|опечат|неверн\w*\s+напис)/i.test(text)) return '✏️ Орфография:'
  return '🔤 Грамматика:'
}

function normalizeLooseErrorLine(line: string): string {
  const trimmed = line.trim()
  if (!trimmed) return trimmed
  if (hasErrorLabelPrefix(trimmed) || /^Комментарий_перевод\s*:/i.test(trimmed) || /^Комментарий\s*:/i.test(trimmed)) {
    return trimmed
  }

  const withoutBullet = trimmed.replace(/^[\-•*]\s*/, '').trim()
  if (!withoutBullet) return trimmed

  const hasArrow = /(?:→|->|=|\bto\b)/i.test(withoutBullet)
  const looksLikeExample = hasArrow || /["'«»“”`]/.test(withoutBullet)
  if (!looksLikeExample) return trimmed

  return `${inferStructuredErrorPrefix(withoutBullet)} ${withoutBullet}`.trim()
}

export function dedupeTranslationErrorBlock(body: string): string {
  const lines = body
    .split(/\r?\n/)
    .map((line) => normalizeLooseErrorLine(line))
    .filter(Boolean)

  const kept: string[] = []
  for (const line of lines) {
    if (kept.some((existing) => looksLikeDuplicateErrorLine(existing, line))) continue
    kept.push(line)
  }

  return kept.join('\n')
}

/**
 * Тело блока «Ошибки:» от модели + одна синтетическая строка из «Комментарий:», если модель
 * не вынесла туда же суть (например артикль). Дубликат по нормализованному тексту не добавляем.
 */
export function mergeErrorsBlockWithSyntheticFromComment(
  payload: string,
  commentBody: string | null | undefined
): string {
  const p = payload.replace(/^\s+|\s+$/g, '')
  const c = (commentBody ?? '').replace(/^\s+|\s+$/g, '')
  if (!c) return p

  const synthetic = buildSyntheticErrorsBlockFromComment(c)
  if (!synthetic) return p

  if (!p) return synthetic

  const pN = normalizeErrorsBlockForDedup(p)
  const sN = normalizeErrorsBlockForDedup(synthetic)
  if (pN.includes(sN)) return p

  const syntheticPair = extractCorrectionPairSignature(synthetic)
  const payloadLines = p.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (syntheticPair) {
    const syntheticCore = extractCoreErrorSignature(synthetic)
    for (const line of payloadLines) {
      const linePair = extractCorrectionPairSignature(line)
      if (linePair && linePair === syntheticPair) return p
      const lineCore = extractCoreErrorSignature(line)
      if (lineCore && syntheticCore && lineCore.includes(syntheticCore)) return p
      if (lineCore && syntheticCore && syntheticCore.includes(lineCore)) return p
    }
  }

  return `${p}\n${synthetic}`.trim()
}
