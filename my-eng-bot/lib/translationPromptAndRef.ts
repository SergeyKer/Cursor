import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import { stripWrappingQuotesFromDrillRussianLine } from '@/lib/extractSingleTranslationNextSentence'
import { clampTranslationRepeatToRuPrompt } from '@/lib/translationRepeatClamp'

/** Скрытый эталон «Повтори» для сервера; в UI не показывается (см. stripTranslationCanonicalRepeatRefLine). */
export const TRAN_CANONICAL_REPEAT_REF_MARKER = '__TRAN_REPEAT_REF__'

function normalizeEnglishSentenceForCard(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  const normalized = normalizeEnglishLearnerContractions(compact)
  return /[.!?]\s*$/.test(normalized) ? normalized : `${normalized}.`
}

/**
 * Русское предложение после «Переведи(те) …:» на одной строке (например «Переведи далее: Я обычно…»).
 */
function extractRussianAfterTranslatePrefixLine(rawLine: string): string | null {
  const trimmed = rawLine.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
  // Не используем \b: в JS он только для [A-Za-z0-9_], для кириллицы «Переведи» граница не срабатывает.
  if (!/^[\d.\)\-\s•]*(?:Переведи|Переведите)(?=\s|:)/i.test(trimmed)) return null
  const colonIdx = trimmed.indexOf(':')
  if (colonIdx === -1) return null
  let rest = trimmed.slice(colonIdx + 1).trim()
  rest = rest
    .replace(/\s+(?:\d+\)\s*)?(?:Переведи|Переведите)[^.]*\.\s*$/i, '')
    .replace(/^\d+\)\s*/i, '')
    .trim()
  if (!/[А-Яа-яЁё]/.test(rest) || rest.length <= 2) return null
  return stripWrappingQuotesFromDrillRussianLine(rest)
}

/**
 * Извлекает русское задание для перевода из текста одной карточки ассистента.
 */
export function extractRussianTranslationTaskFromAssistantContent(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)

  for (const rawLine of lines) {
    if (/^\s*__TRAN_REPEAT_REF__\s*:/i.test(rawLine)) continue
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:/i.test(rawLine)) continue
    // «Комментарий_перевод:» не совпадает с регексом «Комментарий:» — иначе кириллический fallback принимает поддержку за задание.
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий_перевод\s*:/i.test(rawLine)) continue
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Время\s*:/i.test(rawLine)) continue
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Конструкция\s*:/i.test(rawLine)) continue
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Ошибки\s*:/i.test(rawLine)) continue
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Формы\s*:/i.test(rawLine)) continue
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*[+\?-]\s*:/i.test(rawLine)) continue
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Повтори_перевод\s*:/i.test(rawLine)) continue
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:/i.test(rawLine)) continue

    const fromTranslate = extractRussianAfterTranslatePrefixLine(rawLine)
    if (fromTranslate) return fromTranslate

    if (/^(?:[\d.\)\-\s•]*)(?:Переведи|Переведите)(?=\s|:)/i.test(rawLine)) continue

    const stripped = rawLine
      .replace(/\s+(?:\d+\)\s*)?(?:Переведи|Переведите)[^.]*\.\s*$/i, '')
      .replace(/^\d+\)\s*/i, '')
      .trim()
    if (/[А-Яа-яЁё]/.test(stripped) && stripped.length > 2) {
      return stripWrappingQuotesFromDrillRussianLine(stripped)
    }
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

function extractPositiveFormFromTranslationCard(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
  for (const line of lines) {
    const m = /^[\s\-•]*(?:\d+[\.)]\s*)*\+\s*:\s*(.+)\s*$/i.exec(line)
    if (m?.[1]) {
      const v = normalizeEnglishSentenceForCard(m[1] ?? '')
      if (v) return v
    }
  }
  return null
}

function extractQuestionFormFromTranslationCard(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
  for (const line of lines) {
    const m = /^[\s\-•]*(?:\d+[\.)]\s*)*\?\s*:\s*(.+)\s*$/i.exec(line)
    if (m?.[1]) {
      const v = normalizeEnglishSentenceForCard(m[1] ?? '')
      if (v) return v
    }
  }
  return null
}

function extractNegativeFormFromTranslationCard(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
  for (const line of lines) {
    const m = /^[\s\-•]*(?:\d+[\.)]\s*)*-\s*:\s*(.+)\s*$/i.exec(line)
    if (m?.[1]) {
      const v = normalizeEnglishSentenceForCard(m[1] ?? '')
      if (v) return v
    }
  }
  return null
}

/** Согласовано с app/api/chat/route.ts isLikelyRussianNegativeSentence — без импорта из роута. */
function isLikelyRussianNegativePrompt(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return false
  return /(?:^|[\s,;])(?:не|ни|нет|никогда|ничего|никому|нигде)(?=[\s,.!?…]|$)/iu.test(normalized)
}

function pickCanonicalFormEnglishForRuCard(content: string, ru: string): string | null {
  const ruTrim = ru.trim()
  if (/\?\s*$/.test(ruTrim)) {
    const q = extractQuestionFormFromTranslationCard(content)
    if (q) return q
  }
  if (isLikelyRussianNegativePrompt(ruTrim) && !/\?\s*$/.test(ruTrim)) {
    const neg = extractNegativeFormFromTranslationCard(content)
    if (neg) return neg
  }
  return extractPositiveFormFromTranslationCard(content)
}

/**
 * Добавляет в конец ответа скрытую эталонную строку для «Повтори» (по блоку «Формы» и русскому заданию).
 * Не дублирует, если маркер уже есть.
 */
export function appendTranslationCanonicalRepeatRefLine(content: string, ruPrompt: string | null): string {
  const ru = ruPrompt?.trim() ?? ''
  if (!ru) return content
  if (content.includes(`${TRAN_CANONICAL_REPEAT_REF_MARKER}:`)) return content
  const chosen = pickCanonicalFormEnglishForRuCard(content, ru)
  if (!chosen) return content
  const { clamped } = clampTranslationRepeatToRuPrompt(chosen, ru)
  return `${content.trim()}\n${TRAN_CANONICAL_REPEAT_REF_MARKER}: ${clamped}`
}

/** Убирает скрытую строку эталона перед показом в UI и парсингом карточки. */
export function stripTranslationCanonicalRepeatRefLine(content: string): string {
  return content
    .replace(new RegExp(`(?:\\r?\\n|^)\\s*${TRAN_CANONICAL_REPEAT_REF_MARKER}\\s*:.*$`, 'gim'), '')
    .replace(/\s+$/, '')
    .trim()
}
