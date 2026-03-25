/**
 * Определяет, является ли первый «Комментарий:» чистой похвалой без исправлений.
 * Нужно, чтобы не удалять «Повтори:» при смешанных комментариях вроде
 * «Правильно, но нужно Future Perfect».
 *
 * Примечание: `\b` в JS не надёжен для кириллицы — используем явные префиксы.
 */

const PRAISE_STARTERS = ['Отлично', 'Молодец', 'Верно', 'Хорошо', 'Супер', 'Правильно'] as const

function getFirstLineAfterKommentariyLabel(content: string): string {
  const firstLine = content.trim().split(/\r?\n/)[0] ?? ''
  const stripped = firstLine.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
  const m = /^\s*Комментарий\s*:\s*(.*)$/i.exec(stripped)
  return (m?.[1] ?? '').trim()
}

function bodyStartsWithPraiseWord(body: string): boolean {
  const t = body.trim()
  if (!t) return false
  return PRAISE_STARTERS.some(
    (w) =>
      t === w ||
      t.startsWith(`${w} `) ||
      t.startsWith(`${w},`) ||
      t.startsWith(`${w}.`) ||
      t.startsWith(`${w}!`) ||
      t.startsWith(`${w};`)
  )
}

/** Тело первой строки «Комментарий:» — только одно из слов похвалы + необязательная пунктуация. */
export function isKommentariyPurePraiseOnly(content: string): boolean {
  const body = getFirstLineAfterKommentariyLabel(content)
  if (!body) return false
  return PRAISE_STARTERS.some((w) => new RegExp(`^${w}\\s*[!.,]*\\s*$`, 'i').test(body))
}

/** Комментарий начинается со слова похвалы (модель могла добавить «Повтори» ошибочно). */
export function kommentariyStartsWithPraiseWord(content: string): boolean {
  return bodyStartsWithPraiseWord(getFirstLineAfterKommentariyLabel(content))
}

/** Удалять «Повтори» только при чистой похвале без текста исправления. */
export function shouldStripRepeatOnPraise(content: string): boolean {
  const t = content.trim()
  if (!t) return false
  if (!kommentariyStartsWithPraiseWord(t)) return false
  return isKommentariyPurePraiseOnly(t)
}
