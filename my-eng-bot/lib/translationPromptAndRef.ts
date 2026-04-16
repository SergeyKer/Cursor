import { stripWrappingQuotesFromDrillRussianLine } from '@/lib/extractSingleTranslationNextSentence'
import { normalizeEnglishForRepeatMatch } from '@/lib/normalizeEnglishForRepeatMatch'
import {
  clampTranslationRepeatToRuPrompt,
  extractPromptKeywords,
  normalizeRepeatSentenceEnding,
  replaceTranslationRepeatInContent,
} from '@/lib/translationRepeatClamp'

/** Скрытый эталон «Скажи» для сервера; в UI не показывается (см. stripTranslationCanonicalRepeatRefLine). */
export const TRAN_CANONICAL_REPEAT_REF_MARKER = '__TRAN_REPEAT_REF__'

/** Снимает ведущий markdown (**, *, _, #), чтобы «**Переведи:**» снова матчился как задание. */
function stripLeadingMarkdownNoiseForRuTaskLine(s: string): string {
  let t = s.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
  for (let i = 0; i < 16; i++) {
    const next = t
      .replace(/^#{1,6}\s+/, '')
      .replace(/^\d+\)\s*/i, '')
      .replace(/^\*{1,2}\s*/, '')
      .replace(/^_{1,2}\s*/, '')
      .trim()
    if (next === t) break
    t = next
  }
  return t
}

/**
 * Русское предложение после «Переведи(те) …:» на одной строке (например «Переведи далее: Я обычно…»).
 */
function extractRussianAfterTranslatePrefixLine(rawLine: string): string | null {
  const trimmed = stripLeadingMarkdownNoiseForRuTaskLine(rawLine)
  // Не используем \b: в JS он только для [A-Za-z0-9_], для кириллицы «Переведи» граница не срабатывает.
  if (!/^[\d.\)\-\s•]*(?:Переведи|Переведите)(?=\s|:)/i.test(trimmed)) return null
  const colonIdx = trimmed.indexOf(':')
  if (colonIdx === -1) return null
  let rest = trimmed.slice(colonIdx + 1).trim()
  rest = rest
    .replace(/\s+(?:\d+\)\s*)?(?:Переведи|Переведите)[^.]*\.\s*$/i, '')
    .replace(/^\d+\)\s*/i, '')
    .trim()
  rest = stripLeadingMarkdownNoiseForRuTaskLine(rest)
  if (!/[А-Яа-яЁё]/.test(rest) || rest.length <= 2) return null
  return stripWrappingQuotesFromDrillRussianLine(rest)
}

/** Строка «Переведи на английский…» без русского задания в той же строке (после двоеточия). */
function isEnglishOnlyInviteLine(normalized: string): boolean {
  if (normalized.includes(':')) return false
  return (
    /^(?:Переведи|Переведите)(?=\s|[.!?]|$)/i.test(normalized) &&
    /(?:на\s+английск|на\s+англ|английский)/i.test(normalized)
  )
}

/** Снижает ложные срабатывания на «Try again: исправь» и т.п. */
function looksLikeStandaloneRuDrillLine(text: string): boolean {
  const t = text.trim()
  if (t.length < 6) return false
  const cyr = (t.match(/[А-Яа-яЁё]/g) ?? []).length
  const latin = (t.match(/[A-Za-z]/g) ?? []).length
  if (cyr < 4) return false
  return latin === 0 || cyr >= latin * 2
}

function shouldSkipLineWhenScanningForRuTask(rawLine: string): boolean {
  if (/^\s*__TRAN_REPEAT_REF__\s*:/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий_ошибка\s*:/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий_перевод\s*:/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*Время\s*:/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*Конструкция\s*:/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*Ошибки\s*:/i.test(rawLine)) return true
  /** Пункты блока «Ошибки:» — не русское задание drill. */
  if (/^[\s\-•]*[-–—]\s*(?:Лексическая|Грамматическая|Орфографическая)\s+ошибка/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*Формы\s*:/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*(?:\+|\?|-)\s*:/.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*Скажи\s*:/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*(Скажи|Say)\s*:/i.test(rawLine)) return true
  if (/^[\s\-•]*(?:\d+[\.)]\s*)*[🤔🔤📖✏️]/u.test(rawLine)) return true
  return false
}

function tryStandaloneRussianDrillLine(rawLine: string): string | null {
  if (shouldSkipLineWhenScanningForRuTask(rawLine)) return null
  const normalized = stripLeadingMarkdownNoiseForRuTaskLine(rawLine.replace(/^\d+\)\s*/i, '').trim())
  if (!/[А-Яа-яЁё]/.test(normalized) || normalized.length <= 2) return null
  if (/^[\d.\)\-\s•]*(?:Переведи|Переведите)(?=\s|:)/i.test(normalized)) return null
  const out = stripWrappingQuotesFromDrillRussianLine(normalized)
  if (!looksLikeStandaloneRuDrillLine(out)) return null
  return out
}

/**
 * Извлекает русское задание для перевода из текста одной карточки ассистента.
 */
export function extractRussianTranslationTaskFromAssistantContent(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!
    const scanLine = stripLeadingMarkdownNoiseForRuTaskLine(rawLine)
    if (shouldSkipLineWhenScanningForRuTask(scanLine)) continue

    const fromTranslate = extractRussianAfterTranslatePrefixLine(rawLine)
    if (fromTranslate) return fromTranslate

    const normalized = scanLine.replace(/^\d+\)\s*/i, '').trim()
    if (isEnglishOnlyInviteLine(normalized)) {
      if (i + 1 < lines.length) {
        const fromNext = tryStandaloneRussianDrillLine(lines[i + 1]!)
        if (fromNext) return fromNext
      }
      if (i > 0) {
        const fromPrev = tryStandaloneRussianDrillLine(lines[i - 1]!)
        if (fromPrev) return fromPrev
      }
    }
    /** Карточка из UI может хранить только русское предложение без «Переведи:» (см. debug H-ru-extract-miss). */
    const standaloneThisLine = tryStandaloneRussianDrillLine(rawLine)
    if (standaloneThisLine) return standaloneThisLine
  }
  return null
}

export function extractLastTranslationPromptFromMessagesWithIndex(
  messages: ReadonlyArray<{ role: string; content: string }>
): { prompt: string | null; sourceAssistantIndex: number | null } {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.role !== 'assistant') continue
    const hit = extractRussianTranslationTaskFromAssistantContent(msg.content)
    if (hit) return { prompt: hit, sourceAssistantIndex: i }
  }
  return { prompt: null, sourceAssistantIndex: null }
}

export function extractLastTranslationPromptFromMessages(
  messages: ReadonlyArray<{ role: string; content: string }>
): string | null {
  return extractLastTranslationPromptFromMessagesWithIndex(messages).prompt
}

/**
 * Для клампа EN «Скажи» к RU: берём более полную формулировку задания, если цепочка дала усечённый текст
 * (например модель продублировала RU без хвоста «на выходных»), а карточка перед ответом содержит полный вариант.
 */
export function pickAuthoritativeRuPromptForTranslationClamp(
  chainPrompt: string | null | undefined,
  priorCardPrompt: string | null | undefined
): string {
  const a = chainPrompt?.replace(/\s+/g, ' ').trim() ?? ''
  const b = priorCardPrompt?.replace(/\s+/g, ' ').trim() ?? ''
  if (!a) return b
  if (!b) return a
  if (a === b) return a
  if (b.includes(a)) return b
  if (a.includes(b)) return a
  let k = 0
  const lim = Math.min(a.length, b.length)
  while (k < lim && a[k] === b[k]) k++
  if (k >= 25) return a.length >= b.length ? a : b
  return a.length >= b.length ? a : b
}

/** Сообщение ассистента непосредственно перед последним user в истории. */
export function getAssistantContentBeforeLastUser(
  messages: ReadonlyArray<{ role: string; content: string }>
): string | null {
  const lastIdx = messages.length - 1
  if (lastIdx < 0 || messages[lastIdx]?.role !== 'user') return null
  for (let i = lastIdx - 1; i >= 0; i--) {
    if (messages[i]?.role === 'assistant') return messages[i]!.content
  }
  return null
}

export function extractCanonicalRepeatRefEnglishFromContent(content: string): string | null {
  const m = new RegExp(`(?:^|\\n)\\s*${TRAN_CANONICAL_REPEAT_REF_MARKER}\\s*:\\s*(.+)$`, 'im').exec(
    content
  )
  const raw = m?.[1]?.trim()
  return raw || null
}

function isRepeatCuePlausibleForRuPromptLocal(ruPrompt: string | null, englishCue: string): boolean {
  if (!ruPrompt?.trim()) return true
  const promptKeywords = extractPromptKeywords(ruPrompt)
  if (promptKeywords.length === 0) return true
  const enWords = new Set(
    normalizeEnglishForRepeatMatch(englishCue)
      .split(/\s+/)
      .filter((w) => w.length > 1)
  )
  return promptKeywords.some((kw) => enWords.has(kw.toLowerCase()))
}

export function extractVisibleRepeatCueEnglishFromAssistantCard(content: string): string | null {
  const lineRe = /^[\s\-•]*(?:\d+[\.)]\s*)*(?:Скажи|Say)\s*:\s*(.+)$/i
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    const m = lineRe.exec(trimmed)
    const body = m?.[1]?.trim()
    if (body) {
      return body.replace(/^\s*(?:Скажи|Say)\s*:\s*/i, '').trim() || body
    }
  }
  return null
}

/**
 * Снятые с карточки эталоны после clamp: скрытый ref и видимый «Скажи» (если проходит plausibility).
 * Нужен для вердикта, когда оба присутствуют, но расходятся — выбираем тот, с которым совпал ответ.
 */
export function getClampedHiddenAndVisibleGold(
  assistantContent: string,
  ruPrompt: string | null
): { hidden: string | null; visible: string | null } {
  const ru = ruPrompt?.trim() ?? ''
  const rawHidden = extractCanonicalRepeatRefEnglishFromContent(assistantContent)
  let hidden: string | null = null
  if (rawHidden?.trim()) {
    const { clamped } = clampTranslationRepeatToRuPrompt(rawHidden.trim(), ru)
    hidden = (clamped?.trim() || rawHidden.trim()) || null
  }
  const visibleRaw = extractVisibleRepeatCueEnglishFromAssistantCard(assistantContent)
  let visible: string | null = null
  if (visibleRaw?.trim() && isRepeatCuePlausibleForRuPromptLocal(ruPrompt, visibleRaw)) {
    const { clamped } = clampTranslationRepeatToRuPrompt(visibleRaw.trim(), ru)
    visible = (clamped?.trim() || visibleRaw.trim()) || null
  }
  return { hidden, visible }
}

/**
 * Локальный эталон для вердикта: __TRAN_REPEAT_REF__ или видимый «Скажи»
 * (без «Формы», чтобы не сравнивать с диагностическим +:).
 */
export function extractLocalGoldEnglishForVerdict(
  assistantContent: string,
  ruPrompt: string | null
): string | null {
  const { hidden, visible } = getClampedHiddenAndVisibleGold(assistantContent, ruPrompt)
  if (hidden?.trim()) return hidden.trim()
  if (visible?.trim()) return visible.trim()
  return null
}

/**
 * Добавляет скрытую эталонную строку из видимого «Скажи:», если маркера ещё нет (без блока «Формы»).
 */
export function appendTranslationCanonicalRepeatRefLine(content: string, ruPrompt: string | null): string {
  const ru = ruPrompt?.trim() ?? ''
  if (!ru) return content
  if (content.includes(`${TRAN_CANONICAL_REPEAT_REF_MARKER}:`)) return content
  const visible = extractVisibleRepeatCueEnglishFromAssistantCard(content)
  if (visible?.trim() && isRepeatCuePlausibleForRuPromptLocal(ruPrompt, visible)) {
    const { clamped } = clampTranslationRepeatToRuPrompt(visible.trim(), ru)
    const line = (clamped?.trim() || visible.trim()) || ''
    if (line) return `${content.trim()}\n${TRAN_CANONICAL_REPEAT_REF_MARKER}: ${line}`
  }
  return content
}

/** Убирает скрытую строку эталона перед показом в UI и парсингом карточки. */
export function stripTranslationCanonicalRepeatRefLine(content: string): string {
  return content
    .replace(new RegExp(`(?:\\r?\\n|^)\\s*${TRAN_CANONICAL_REPEAT_REF_MARKER}\\s*:.*$`, 'gim'), '')
    .replace(/\s+$/, '')
    .trim()
}

/** Карточка с протоколом ошибки перевода (есть что показать ученику и чем сверять повтор). */
export function isTranslationErrorProtocolForSayReconcile(content: string): boolean {
  const t = content.trim()
  if (!t) return false
  if (/(^|\n)\s*Ошибки\s*:/im.test(t)) return true
  if (/(^|\n)\s*Комментарий_перевод\s*:/im.test(t)) return true
  if (/(^|\n)\s*(?:Скажи|Say)\s*:/im.test(t)) return true
  return false
}

/** Одна финальная строка скрытого эталона (без дублей маркера). */
export function replaceTranslationCanonicalRepeatRefInContent(content: string, authoritativeEnglish: string): string {
  const core = normalizeRepeatSentenceEnding(authoritativeEnglish.trim())
  if (!core) return content
  const stripped = stripTranslationCanonicalRepeatRefLine(content)
  return `${stripped.trim()}\n${TRAN_CANONICAL_REPEAT_REF_MARKER}: ${core}`.trim()
}

/**
 * Выравнивает видимое «Скажи:» со скрытым `__TRAN_REPEAT_REF__`, если после клампа к RU они расходятся.
 * Авторитет — скрытый ref (API/инструкция модели); видимое не должно копировать черновик ученика.
 */
export function reconcileTranslationSayWithHiddenRef(content: string, ruPrompt: string | null): string {
  const ru = ruPrompt?.trim() ?? ''
  if (!ru) return content
  if (!extractCanonicalRepeatRefEnglishFromContent(content)) return content
  if (!isTranslationErrorProtocolForSayReconcile(content)) return content

  const { hidden } = getClampedHiddenAndVisibleGold(content, ru)
  const hiddenTrim = hidden?.trim()
  if (!hiddenTrim) return content

  const rawVisible = extractVisibleRepeatCueEnglishFromAssistantCard(content)
  let visibleBody: string | null = null
  if (rawVisible?.trim()) {
    const { clamped } = clampTranslationRepeatToRuPrompt(rawVisible.trim(), ru)
    visibleBody = (clamped?.trim() || rawVisible.trim()) || null
  }

  const auth = normalizeRepeatSentenceEnding(hiddenTrim)
  if (!auth) return content

  if (visibleBody && normalizeEnglishForRepeatMatch(visibleBody) === normalizeEnglishForRepeatMatch(auth)) {
    return content
  }

  const out = replaceTranslationRepeatInContent(content, auth)
  return replaceTranslationCanonicalRepeatRefInContent(out, auth)
}
