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

function extractFirstVisibleRepeatEnglishFromAssistantCard(content: string): string | null {
  const lineRe = /^[\s\-•]*(?:\d+[\.)]\s*)*(?:Повтори|Repeat|Say|Скажи)\s*:\s*(.+)$/i
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    const m = lineRe.exec(trimmed)
    const body = m?.[1]?.trim()
    if (body) {
      const cleaned = stripLeadingRepeatRuPrompt(body.replace(/^\s*(?:Повтори|Repeat|Say|Скажи)\s*:\s*/i, '')).trim()
      return cleaned || body
    }
  }
  return null
}

/**
 * Канонический эталон с карточки текущего drill:
 * 1) __TRAN_REPEAT_REF__, 2) первая видимая строка Повтори/Repeat/Say/Скажи.
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
