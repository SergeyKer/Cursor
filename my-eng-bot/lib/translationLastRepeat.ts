import { normalizeEnglishForRepeatMatch } from '@/lib/normalizeEnglishForRepeatMatch'
import { extractPromptKeywords } from '@/lib/translationRepeatClamp'
import { stripLeadingRepeatRuPrompt } from '@/lib/translationProtocolLines'
import {
  extractCanonicalRepeatRefEnglishFromContent,
  extractLastTranslationPromptFromMessagesWithIndex,
  getAssistantContentBeforeLastUser,
} from '@/lib/translationPromptAndRef'

/** Есть ли в английском эталоне хотя бы одно ключевое слово из текущего русского задания (тема из словаря). */
function isRepeatCuePlausibleForRuPrompt(ruPrompt: string | null, englishCue: string): boolean {
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

function repeatTextMatchesCue(userText: string, cue: string): boolean {
  const u = normalizeEnglishForRepeatMatch(userText)
  const c = normalizeEnglishForRepeatMatch(cue)
  return Boolean(u && c && u === c)
}

function stripSimpleHtmlTags(s: string): string {
  return s.replace(/<[^>]{0,400}>/gi, '')
}

/** Снимает типичный markdown/цитирование в начале строки протокола (иначе `**Скажи:**` не матчится). */
function stripAssistantProtocolMarkdownPrefix(line: string): string {
  let t = line.trim()
  for (let k = 0; k < 12; k++) {
    const next = t
      .replace(/^>\s*/, '')
      .replace(/^#{1,6}\s+/, '')
      .replace(/^\*{1,2}\s*/, '')
      .replace(/^_{1,2}\s*/, '')
      .trim()
    if (next === t) break
    t = next
  }
  return t
}

/**
 * Ответ совпадает с эталоном «Скажи» / __TRAN__ с предыдущей карточки (учитывается видимая строка,
 * если скрытый ref/plausibility дали другой канон, а пользователь повторил то, что видел в UI).
 */
export function userMatchesPriorAssistantRepeatOrVisibleSay(
  userText: string,
  messages: ReadonlyArray<{ role: string; content: string }>
): boolean {
  const priorCardRaw = getAssistantContentBeforeLastUser(messages) ?? ''
  const priorCard = stripSimpleHtmlTags(priorCardRaw)

  const hiddenRef = extractCanonicalRepeatRefEnglishFromContent(priorCard)?.trim() ?? ''
  if (hiddenRef && repeatTextMatchesCue(userText, hiddenRef)) return true

  const prior = extractPriorAssistantRepeatEnglish(messages)?.trim() ?? ''
  if (prior && repeatTextMatchesCue(userText, prior)) return true

  const visible = extractFirstVisibleRepeatEnglishFromAssistantCard(priorCard)?.trim() ?? ''
  if (!visible) return false
  if (!repeatTextMatchesCue(userText, visible)) return false
  return !prior || !repeatTextMatchesCue(userText, prior)
}

/** Строка похожа на полноценное EN-предложение для карточки «Скажи», а не пункт «Ошибки: - like → love». */
function looksLikeEnglishDrillRepeatLine(s: string): boolean {
  const t = s.trim()
  if (t.length < 2) return false
  if (/^[-–—*•]\s/.test(t) && (/→|->/.test(t) || /[А-Яа-яЁё]/.test(t))) return false
  const lat = (t.match(/[A-Za-z]/g) ?? []).length
  const cyr = (t.match(/[А-Яа-яЁё]/g) ?? []).length
  if (cyr > 0 && lat < cyr * 2) return false
  if (lat >= 12) return true
  return cyr === 0 && lat >= 3 && t.length <= 48
}

function scanEnglishAfterSayHeader(lines: readonly string[], startAfter: number): string {
  for (let j = startAfter; j < lines.length; j++) {
    const next = lines[j] ?? ''
    if (!next) continue
    if (/^(?:Комментарий|Комментарий_перевод|Ошибки|Переведи|__TRAN)/i.test(next)) break
    if (looksLikeEnglishDrillRepeatLine(next)) return next
  }
  return ''
}

function extractVisibleSayLooseFallback(full: string): string | null {
  const fullClean = stripSimpleHtmlTags(full)
  const m = /(?:Скажи|Say)\s*[:：]?\s*/i.exec(fullClean)
  if (!m) return null
  const tail = fullClean.slice(m.index + m[0].length).replace(/^\s+/, '')
  const tailLines = tail.split(/\r?\n/)
  for (const raw of tailLines) {
    const t = stripAssistantProtocolMarkdownPrefix(raw)
    if (!t) continue
    if (/^(?:Комментарий|Комментарий_перевод|Ошибки|Переведи|__TRAN)/i.test(t)) break
    if (!looksLikeEnglishDrillRepeatLine(t)) continue
    const firstSentenceMatch = t.match(/^[^.!?]+[.!?]?/)
    const body = (firstSentenceMatch ? firstSentenceMatch[0] : t).trim()
    if (body.length < 2 || !/[A-Za-z]/.test(body)) continue
    const cleaned = stripLeadingRepeatRuPrompt(body.replace(/^\s*(?:Скажи|Say)\s*:\s*/i, '')).trim()
    return cleaned || body
  }
  return null
}

function extractFirstVisibleRepeatEnglishFromAssistantCard(content: string): string | null {
  const lines = stripSimpleHtmlTags(content)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
  const headerRe = /^[\s\-•]*(?:\d+[\.)]\s*)*(?:Скажи|Say)\s*[:：]?\s*(.*)$/i
  for (let i = 0; i < lines.length; i++) {
    const trimmed = stripAssistantProtocolMarkdownPrefix(lines[i] ?? '')
    const m = headerRe.exec(trimmed)
    if (!m) continue
    let afterKeyword = (m[1] ?? '').trim()
    if (!afterKeyword || /^[:.]$/.test(afterKeyword) || !looksLikeEnglishDrillRepeatLine(afterKeyword)) {
      const scannedLines = lines.map((ln) => stripAssistantProtocolMarkdownPrefix(ln))
      const scanned = scanEnglishAfterSayHeader(scannedLines, i + 1)
      if (scanned) afterKeyword = scanned
    }
    if (!afterKeyword || !looksLikeEnglishDrillRepeatLine(afterKeyword)) continue
    const firstSentenceMatch = afterKeyword.match(/^[^.!?]+[.!?]?/)
    const body = (firstSentenceMatch ? firstSentenceMatch[0] : afterKeyword).trim()
    if (body.length < 2 || !/[A-Za-z]/.test(body)) continue
    const cleaned = stripLeadingRepeatRuPrompt(body.replace(/^\s*(?:Скажи|Say)\s*:\s*/i, '')).trim()
    return cleaned || body
  }
  return extractVisibleSayLooseFallback(content)
}

/**
 * Канонический эталон с карточки текущего drill:
 * 1) __TRAN_REPEAT_REF__, 2) первая видимая строка Скажи/Say.
 */
function extractDrillCardGoldEnglishForRepeat(content: string, ruTask: string | null): string | null {
  const ref = extractCanonicalRepeatRefEnglishFromContent(content)
  if (ref?.trim() && isRepeatCuePlausibleForRuPrompt(ruTask, ref.trim())) {
    return ref.trim()
  }
  const visible = extractFirstVisibleRepeatEnglishFromAssistantCard(content)
  if (visible?.trim() && isRepeatCuePlausibleForRuPrompt(ruTask, visible.trim())) {
    return visible.trim()
  }
  return null
}

/**
 * Эталон для «Скажи» / enforce (режим перевода).
 *
 * Учитывается только сегмент **текущего** «Переведи / Переведи далее»: карточки **раньше** индекса
 * последнего ассистента с этим русским заданием игнорируются (не подтягиваем Скажи из прошлой темы).
 *
 * Внутри сегмента: «Скажи:» согласуется с русским промптом по ключевым словам; при нескольких —
 * максимум пересечения с ответом пользователя, при равенстве — более ранняя карточка.
 *
 * Иначе эталон с карточки перед user (видимый Скажи / __TRAN_REPEAT_REF__);
 * приоритет у видимого Скажи (то, что реально видит ученик).
 * Если не бьётся с промптом — берём с карточки-источника задания.
 */
export function extractPriorAssistantRepeatEnglish(
  messages: ReadonlyArray<{ role: string; content: string }>
): string | null {
  const lastIdx = messages.length - 1
  if (lastIdx < 0 || messages[lastIdx]?.role !== 'user') return null

  const { prompt: ruTask, sourceAssistantIndex } = extractLastTranslationPromptFromMessagesWithIndex(messages)
  if (sourceAssistantIndex != null) {
    const src = messages[sourceAssistantIndex]?.content
    if (messages[sourceAssistantIndex]?.role === 'assistant' && src) {
      const fromDrillCard = extractDrillCardGoldEnglishForRepeat(src, ruTask)
      if (fromDrillCard) return fromDrillCard
    }
  }

  // Fallback для нестандартных/старых карточек без явного sourceAssistantIndex.
  const promptContent = getAssistantContentBeforeLastUser(messages)
  if (!promptContent) return null
  return extractDrillCardGoldEnglishForRepeat(promptContent, ruTask)
}
