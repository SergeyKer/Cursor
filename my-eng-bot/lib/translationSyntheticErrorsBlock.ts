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

  return `${p}\n${synthetic}`.trim()
}
