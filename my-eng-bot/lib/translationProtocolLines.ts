/**
 * Общие шаблоны для строк протокола режима «Перевод» (заголовки блоков ответа ассистента).
 */

/** Имена блоков в формате «Имя: …». Специфичные варианты идут перед `Комментарий`, иначе регекс съест префикс. */
export const TRANSLATION_PROTOCOL_BLOCK_NAMES =
  'Комментарий_перевод|Комментарий_мусор|Комментарий|Ошибки|Скажи|Повтори|Repeat|Say'

/** Строка начинается с заголовка протокольного блока перевода. */
export const TRANSLATION_PROTOCOL_BLOCK_LINE = new RegExp(
  `^\\s*(?:\\d+\\)\\s*)?(?:${TRANSLATION_PROTOCOL_BLOCK_NAMES})\\s*:`,
  'i'
)

/** Модель иногда вставляет «Повтори:» сразу после «Скажи:» — убираем лишние ведущие префиксы. */
export function stripLeadingRepeatRuPrompt(body: string): string {
  let s = body.trim()
  while (/^Повтори\s*:\s*/i.test(s)) {
    s = s.replace(/^Повтори\s*:\s*/i, '').trim()
  }
  return s
}

/**
 * Убирает внешние парные кавычки вокруг всей строки (модель часто оборачивает эталон для «Повтори»).
 * Повторяет, пока строка целиком в кавычках — без рекурсии в глубину содержимого.
 */
export function stripWrappingQuotes(body: string): string {
  let s = body.trim()
  for (;;) {
    if (s.length < 2) return s
    const first = s[0]
    const last = s[s.length - 1]
    const pair =
      (first === '"' && last === '"') ||
      (first === "'" && last === "'") ||
      (first === '\u201C' && last === '\u201D') ||
      (first === '\u2018' && last === '\u2019') ||
      (first === '«' && last === '»')
    if (!pair) return s
    s = s.slice(1, -1).trim()
  }
}
