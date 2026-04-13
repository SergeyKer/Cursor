import { inferTranslationCommentErrorType } from '@/lib/translationCommentCoach'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Убирает подписи «Грамматика:» / «Орфография:» / «Лексика:» после маркерного эмодзи (старый и новый формат).
 */
export function stripTranslationErrorSubsectionLabels(line: string): string {
  return line.replace(
    /^(\s*(?:[-•*]\s*)?(🔤|📖|✏️)\s+)(Грамматика|Орфография|Лексика)\s*:\s*/iu,
    '$1'
  )
}

/** Эмодзи-маркер строки блока «Ошибки:» по типу из inferTranslationCommentErrorType. */
function mapErrorTypeToSyntheticLinePrefix(inferredType: string): string {
  const t = inferredType.toLowerCase()
  // Keep tense explanation only on standalone "Время:" line in protocol.
  if (t.includes('времени')) return '🔤'
  if (t.includes('лексическ')) return '📖'
  if (t.includes('перевод')) return '📖'
  if (t.includes('орфограф')) return '✏️'
  return '🔤'
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
    // «Ошибка артикля:» — явно; старый шаблон с \w* ломался на «артикля» (остаётся «: текст»).
    /^ошибка\s+употребления\s+артикля\s*[.:]\s*/i,
    /^ошибка\s+артикля\s*[.:]\s*/i,
  ]
  let out = trimmed
  for (const re of commonHeads) {
    if (re.test(out)) {
      out = out.replace(re, '').trim()
      break
    }
  }
  if (inferredType.toLowerCase().includes('орфограф')) {
    out = out.replace(/^ошибка\s+формы\s+глагола\s*[.:]\s*/i, '').trim()
  }
  if (inferredType.toLowerCase().includes('перевод')) {
    out = out.replace(/^ошибка\s+типа\s+предложения\s*[.:]\s*/i, '').trim()
  }
  return out
}

/**
 * Предложения вроде «Вижу, что вы правильно…» — похвала/мотивация, не строка блока «Ошибки:».
 * Возвращает хвост без таких предложений и объединённую похвалу для «Комментарий_перевод:».
 */
function partitionEncouragementSentencesInDetail(detail: string): { core: string; praise: string | null } {
  const normalized = detail.replace(/\s+/g, ' ').trim()
  if (!normalized) return { core: '', praise: null }
  const sentences = normalized
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const coreParts: string[] = []
  const praiseParts: string[] = []
  for (const s of sentences) {
    // Без флага `u` в JS `\b` для кириллицы ненадёжен — достаточно префикса строки.
    if (/^(?:Вижу|Замечаю|Я\s+вижу)/i.test(s)) praiseParts.push(s)
    else coreParts.push(s)
  }
  return {
    core: coreParts.join(' ').trim(),
    praise: praiseParts.length ? praiseParts.join(' ').trim() : null,
  }
}

/**
 * Строка блока «Ошибки:» считается похвалой, если после эмодзи-маркера текст начинается с «Вижу» / «Замечаю».
 */
export function looksLikeTranslationEncouragementErrorsLine(line: string): boolean {
  const body = stripTranslationErrorSubsectionLabels(line)
    .replace(/^\s*(?:[-•*]\s*)?(?:🔤|📖|✏️|🤔|⏱️)\s+/u, '')
    .trim()
  return /^(?:Вижу|Замечаю|Я\s+вижу)/i.test(body)
}

/**
 * Убирает из тела «Ошибки:» строки-похвалы и отдаёт их отдельно — для карточки «Комментарий_перевод:».
 */
export function partitionEncouragementLinesFromTranslationErrorsPayload(payload: string): {
  errorsRest: string
  praiseFromErrors: string | null
} {
  const trimmed = payload.replace(/^\s+|\s+$/g, '')
  if (!trimmed) return { errorsRest: '', praiseFromErrors: null }
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const kept: string[] = []
  const praiseLines: string[] = []
  for (const line of lines) {
    if (looksLikeTranslationEncouragementErrorsLine(line)) {
      const plain = stripTranslationErrorSubsectionLabels(line)
        .replace(/^\s*(?:[-•*]\s*)?(?:🔤|📖|✏️|🤔|⏱️)\s+/u, '')
        .trim()
      if (plain) praiseLines.push(plain)
    } else {
      kept.push(line)
    }
  }
  return {
    errorsRest: kept.join('\n').trim(),
    praiseFromErrors: praiseLines.length ? praiseLines.join('\n\n') : null,
  }
}

export function dedupeTranslationPraiseParagraphs(parts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of parts) {
    const p = String(raw ?? '').trim()
    if (!p) continue
    const key = p.replace(/\s+/g, ' ').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p.replace(/\s+/g, ' ').trim())
  }
  return out
}

/**
 * Синтетическая строка «Ошибки:» из «Комментарий:» + похвата, которую нужно показать в «Комментарий_перевод:».
 */
export function extractTranslationErrorSynthAndPraiseFromComment(commentBody: string): {
  synthetic: string | null
  praiseFromComment: string | null
} {
  const trimmed = commentBody.replace(/^\s+|\s+$/g, '')
  if (!trimmed) return { synthetic: null, praiseFromComment: null }
  if (/^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)(?:[\s!,.?:;"'»)]|$)/i.test(trimmed)) {
    return { synthetic: null, praiseFromComment: null }
  }

  const inferred = inferTranslationCommentErrorType(trimmed)
  const prefix = mapErrorTypeToSyntheticLinePrefix(inferred)
  const detail = stripLeadingErrorTypePhrase(trimmed, inferred)
  const rawDetail = (detail || trimmed).replace(/\s+/g, ' ').trim()
  const { core, praise } = partitionEncouragementSentencesInDetail(rawDetail)
  const text = core.trim()
  if (!text) return { synthetic: null, praiseFromComment: praise }
  return { synthetic: `${prefix} ${text}`.trim(), praiseFromComment: praise }
}

/**
 * Одна-две строки для блока «Ошибки:», если модель не вывела секцию сама.
 * Не дублирует заголовок типа: деталь — хвост комментария.
 */
export function buildSyntheticErrorsBlockFromComment(commentBody: string): string | null {
  return extractTranslationErrorSynthAndPraiseFromComment(commentBody).synthetic
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
    text.match(/(?:before|перед)\s+["'«»]?([a-z]{3,})["'»]?\b/i) ??
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

/** Существительное в латинских кавычках (для дедупа подсказок про один и тот же артикль). */
function extractQuotedEnglishContentNoun(s: string): string | null {
  const re = /"([a-z]{3,})"/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    const w = (m[1] ?? '').toLowerCase()
    if (w && !['a', 'an', 'the', 'and', 'for', 'not'].includes(w)) return w
  }
  return null
}

/** Существительное в фокусе артикля: кавычки или «перед sister …». */
function extractArticleFocusNoun(s: string): string | null {
  const quoted = extractQuotedEnglishContentNoun(s)
  if (quoted) return quoted
  // Не используем \b перед кириллицей: в JS граница слова только для [A-Za-z0-9_].
  const before = /(?:^|[\s.:,])(перед)\s+([a-z]{3,})\b/i.exec(s)
  const w = before?.[2]?.toLowerCase() ?? ''
  if (w && !['the', 'you', 'him', 'her', 'its', 'our', 'him', 'them'].includes(w)) return w
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

  const aFocus = extractArticleFocusNoun(a)
  const bFocus = extractArticleFocusNoun(b)
  if (
    aFocus &&
    bFocus &&
    aFocus === bFocus &&
    /артикл|\ba\b|\ban\b|article/i.test(a) &&
    /артикл|\ba\b|\ban\b|article/i.test(b)
  ) {
    return true
  }

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
  if (/(артикл| a\b| an\b| the\b|article)/i.test(text)) return '🔤'
  if (/(лексическ|word choice|wrong word|не то слово|словар)/i.test(text)) return '📖'
  if (/(перевод|translate|translation|русск(?:ие|их)?\s+слов|кирилл)/i.test(text)) return '📖'
  if (/(орфограф|spelling|опечат|неверн\w*\s+напис)/i.test(text)) return '✏️'
  return '🔤'
}

function normalizeLooseErrorLine(line: string): string {
  const trimmed = stripTranslationErrorSubsectionLabels(line.trim())
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

/**
 * Глаголы в форме V-ing из эталона «Повтори» для continuous / perfect continuous:
 * после been / am,is,are,was,were / will be — эти -ing нельзя подменять на V3/ed в блоке «Ошибки».
 */
export function extractContinuousDrillProtectedIngForms(repeatEnglish: string): Set<string> {
  const repeatLower = repeatEnglish.toLowerCase()
  const out = new Set<string>()
  const add = (w: string | undefined) => {
    const t = (w ?? '').toLowerCase().replace(/^'+|'+$/g, '')
    if (t.length >= 4 && t.endsWith('ing')) out.add(t)
  }
  for (const m of repeatLower.matchAll(/\bbeen\s+([a-z']{2,}ing)\b/g)) add(m[1])
  for (const m of repeatLower.matchAll(/\b(?:am|is|are|was|were)\s+([a-z']{2,}ing)\b/g)) add(m[1])
  for (const m of repeatLower.matchAll(/\bwill\s+be\s+([a-z']{2,}ing)\b/g)) add(m[1])
  return out
}

function shouldDropContinuousTenseErrorLine(line: string, protectedIng: Set<string>): boolean {
  const lower = line.toLowerCase()
  if (
    /(?:ошибка\s+времени|⏰\s*ошибка\s+времени)/i.test(lower) &&
    (/\bv3\b/i.test(line) || /треть[ьяейиёю]+\s+форм/i.test(lower))
  ) {
    return true
  }

  const arrowRe =
    /['"`«]?([a-z]{3,}ing)['"`»]?\s*(?:→|->)\s*['"`«]?([a-z]{3,}(?:ed|t|en)|learned|learnt)['"`»]?/gi
  for (const m of line.matchAll(arrowRe)) {
    const ing = (m[1] ?? '').toLowerCase()
    if (protectedIng.has(ing)) return true
  }

  for (const ing of protectedIng) {
    const ingEsc = ing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!new RegExp(`\\b${ingEsc}\\b`, 'i').test(lower)) continue
    if (
      new RegExp(
        `\\b${ingEsc}\\b[^.\n]{0,90}?(?:→|->|на\\s+)(?:learned|learnt|[a-z]{3,}ed)\\b`,
        'i'
      ).test(line)
    ) {
      return true
    }
  }

  return false
}

/**
 * Убирает из тела «Ошибки» противоречивые подсказки (V3/ed вместо нужного V-ing) для дрила *_continuous.
 */
export function stripConflictingContinuousTenseErrorLines(
  errorsBody: string,
  tense: string,
  repeatEnglish: string
): string {
  if (!errorsBody.trim() || !tense.endsWith('_continuous')) return errorsBody
  const protectedIng = extractContinuousDrillProtectedIngForms(repeatEnglish)
  if (protectedIng.size === 0) return errorsBody

  const lines = errorsBody.split(/\r?\n/)
  const kept = lines.filter((line) => {
    const trimmed = line.trim()
    if (!trimmed) return true
    return !shouldDropContinuousTenseErrorLine(trimmed, protectedIng)
  })
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
}

const TRANSLATION_ERRORS_HEADER_RE =
  /^(Комментарий_перевод|Комментарий|Ошибки|Время|Конструкция|Формы|Скажи|Повтори|Repeat|Say)\s*:/i

/**
 * Находит блок «Ошибки:» в ответе перевода и прогоняет тело через stripConflictingContinuousTenseErrorLines.
 */
export function sanitizeTranslationPayloadContinuousErrors(
  content: string,
  tense: string,
  repeatEnglish: string | null | undefined
): string {
  if (!content.trim() || !tense.endsWith('_continuous')) return content
  const repeat = (repeatEnglish ?? '').trim()
  if (!repeat) return content

  const lines = content.split(/\r?\n/)
  const errIdx = lines.findIndex((l) => /^\s*Ошибки\s*:/i.test(l))
  if (errIdx === -1) return content

  const errLine = lines[errIdx] ?? ''
  const inlineRest = errLine.replace(/^\s*Ошибки\s*:\s*/i, '').trim()
  const bodyLines: string[] = []
  if (inlineRest) bodyLines.push(inlineRest)

  let j = errIdx + 1
  while (j < lines.length && !TRANSLATION_ERRORS_HEADER_RE.test((lines[j] ?? '').trim())) {
    bodyLines.push(lines[j] ?? '')
    j++
  }

  const bodyText = bodyLines.join('\n')
  const newBody = stripConflictingContinuousTenseErrorLines(bodyText, tense, repeat)
  if (newBody === bodyText) return content

  const before = lines.slice(0, errIdx)
  const after = lines.slice(j)
  const errorsHeader = newBody.trim() ? `Ошибки:\n${newBody.trim()}` : 'Ошибки:'
  return [...before, errorsHeader, ...after].join('\n').trim()
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
