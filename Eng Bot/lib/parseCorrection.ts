/**
 * Извлекает блок **Correction:** из ответа ассистента для отдельного отображения.
 * Возвращает { correction: string | null, rest: string }.
 */
export function parseCorrection(text: string): {
  correction: string | null
  rest: string
} {
  const marker = '**Correction:**'
  const idx = text.indexOf(marker)
  if (idx === -1) {
    return { correction: null, rest: text.trim() }
  }
  const afterMarker = text.slice(idx + marker.length).trim()
  const firstParagraph = afterMarker.split(/\n\n/)[0]?.trim() ?? ''
  const afterBlock = afterMarker.slice(firstParagraph.length).replace(/^\n\n?/, '').trim()
  const rest = (text.slice(0, idx).trim() + (afterBlock ? '\n\n' + afterBlock : '')).trim()
  return {
    correction: firstParagraph || null,
    rest: rest || text.trim(),
  }
}
