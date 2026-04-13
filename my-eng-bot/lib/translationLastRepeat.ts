import { normalizeEnglishForRepeatMatch } from '@/lib/normalizeEnglishForRepeatMatch'
import { extractPromptKeywords } from '@/lib/translationRepeatClamp'
import { stripLeadingRepeatRuPrompt } from '@/lib/translationProtocolLines'
import {
  extractCanonicalRepeatRefEnglishFromContent,
  extractLastTranslationPromptFromMessagesWithIndex,
  getAssistantContentBeforeLastUser,
} from '@/lib/translationPromptAndRef'

function scoreUserRepeatOverlapTranslation(userText: string, candidate: string): number {
  const u = normalizeEnglishForRepeatMatch(userText)
  const c = normalizeEnglishForRepeatMatch(candidate)
  if (!u || !c) return 0
  const uWords = u.split(/\s+/).filter((w) => w.length > 1)
  const cSet = new Set(c.split(/\s+/).filter((w) => w.length > 1))
  let n = 0
  for (const w of uWords) {
    if (cSet.has(w)) n++
  }
  return n
}

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

function extractRefOrRepeatEnglishFromAssistantCard(content: string): string | null {
  const lineRe = /^[\s\-•]*(?:\d+[\.)]\s*)*(?:Повтори|Repeat|Say|Скажи)\s*:\s*(.+)$/i
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    const m = lineRe.exec(trimmed)
    const body = m?.[1]?.trim()
    if (body) {
      return body.replace(/^\s*(?:Повтори|Repeat|Say|Скажи)\s*:\s*/i, '').trim() || body
    }
  }
  const ref = extractCanonicalRepeatRefEnglishFromContent(content)
  if (ref?.trim()) return ref.trim()
  return null
}

/**
 * Последняя строка «Скажи:» в тексте одной карточки ассистента (английский эталон для UI).
 */
function extractLastRepeatTransCueEnglishFromAssistantContent(content: string): string | null {
  let last: string | null = null
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    const m = /^[\s\-•]*(?:\d+[\.)]\s*)*Скажи\s*:\s*(.+)$/i.exec(trimmed)
    if (!m?.[1]) continue
    const cleaned = stripLeadingRepeatRuPrompt(m[1].trim()).trim()
    if (cleaned) last = cleaned
  }
  return last
}

/**
 * Эталон для «Повтори» / enforce (режим перевода).
 *
 * Учитывается только сегмент **текущего** «Переведи / Переведи далее»: карточки **раньше** индекса
 * последнего ассистента с этим русским заданием игнорируются (не подтягиваем Скажи из прошлой темы).
 *
 * Внутри сегмента: «Скажи:» согласуется с русским промптом по ключевым словам; при нескольких —
 * максимум пересечения с ответом пользователя, при равенстве — более ранняя карточка.
 *
 * Иначе эталон с карточки перед user (видимый Повтори / __TRAN_REPEAT_REF__);
 * приоритет у видимого Повтори (то, что реально видит ученик).
 * Если не бьётся с промптом — берём с карточки-источника задания.
 */
export function extractPriorAssistantRepeatEnglish(
  messages: ReadonlyArray<{ role: string; content: string }>
): string | null {
  const lastIdx = messages.length - 1
  if (lastIdx < 0 || messages[lastIdx]?.role !== 'user') return null

  const userText = messages[lastIdx]?.content ?? ''
  const { prompt: ruTask, sourceAssistantIndex } = extractLastTranslationPromptFromMessagesWithIndex(messages)
  const minAssistantIdx = sourceAssistantIndex ?? 0

  const transCues: { idx: number; cue: string }[] = []
  for (let i = minAssistantIdx; i < lastIdx; i++) {
    if (messages[i]?.role !== 'assistant') continue
    const cue = extractLastRepeatTransCueEnglishFromAssistantContent(messages[i]!.content)
    if (!cue?.trim()) continue
    const trimmed = cue.trim()
    if (!isRepeatCuePlausibleForRuPrompt(ruTask, trimmed)) continue
    transCues.push({ idx: i, cue: trimmed })
  }

  if (transCues.length >= 2) {
    let best = transCues[0]!
    let bestScore = scoreUserRepeatOverlapTranslation(userText, best.cue)
    for (let k = 1; k < transCues.length; k++) {
      const t = transCues[k]!
      const s = scoreUserRepeatOverlapTranslation(userText, t.cue)
      if (s > bestScore || (s === bestScore && t.idx < best.idx)) {
        bestScore = s
        best = t
      }
    }
    return best.cue
  }
  if (transCues.length === 1) return transCues[0]!.cue

  const promptContent = getAssistantContentBeforeLastUser(messages)
  let fromCard = promptContent ? extractRefOrRepeatEnglishFromAssistantCard(promptContent) : null
  if (fromCard && !isRepeatCuePlausibleForRuPrompt(ruTask, fromCard)) {
    fromCard = null
  }
  if (!fromCard && sourceAssistantIndex != null) {
    const src = messages[sourceAssistantIndex]?.content
    if (messages[sourceAssistantIndex]?.role === 'assistant' && src) {
      fromCard = extractRefOrRepeatEnglishFromAssistantCard(src)
      if (fromCard && !isRepeatCuePlausibleForRuPrompt(ruTask, fromCard)) {
        fromCard = null
      }
    }
  }

  return fromCard
}
