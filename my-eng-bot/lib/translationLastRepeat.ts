import {
  extractCanonicalRepeatRefEnglishFromContent,
  getAssistantContentBeforeLastUser,
} from '@/lib/translationPromptAndRef'

/**
 * Эталон для «Повтори» / enforce — только из карточки ассистента **перед последним user** (текущее «Переведи далее»).
 * 1) Скрытый «__TRAN_REPEAT_REF__:» (перевод русской строки задания).
 * 2) Иначе видимое «Повтори:» на той же карточке (цепочка исправления).
 * Не поднимаемся по истории к старым «Повтори» — иначе эталон от другого предложения.
 */
export function extractPriorAssistantRepeatEnglish(
  messages: ReadonlyArray<{ role: string; content: string }>
): string | null {
  const promptContent = getAssistantContentBeforeLastUser(messages)
  if (!promptContent) return null

  const ref = extractCanonicalRepeatRefEnglishFromContent(promptContent)
  if (ref?.trim()) return ref.trim()

  const markerRe = /(?:^|\n)\s*(?:Повтори|Repeat|Say|Скажи)\s*:\s*(.+)$/im
  const match = markerRe.exec(promptContent)
  if (match?.[1]) {
    const raw = match[1]
      .trim()
      .replace(/^\s*(?:Повтори|Repeat|Say|Скажи)\s*:\s*/i, '')
      .trim()
    return raw || null
  }

  return null
}
