/**
 * Извлекает английский текст из «Повтори:» только из последнего сообщения assistant
 * перед текущим ответом пользователя (для гейта SUCCESS при провокациях).
 * Если у последнего assistant нет строки Повтори — возвращает null (не подмешивает старые Повтори).
 */
export function extractPriorAssistantRepeatEnglish(
  messages: ReadonlyArray<{ role: string; content: string }>
): string | null {
  const markerRe = /(?:^|\n)\s*(?:Повтори|Repeat|Say|Скажи)\s*:\s*(.+)$/im

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'user') continue
    if (m?.role !== 'assistant') continue

    const match = markerRe.exec(m.content)
    if (match?.[1]) {
      const raw = match[1]
        .trim()
        .replace(/^\s*(?:Повтори|Repeat|Say|Скажи)\s*:\s*/i, '')
        .trim()
      return raw || null
    }
    return null
  }

  return null
}
