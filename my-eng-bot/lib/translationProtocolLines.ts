/**
 * Общие шаблоны для строк протокола режима «Перевод» (заголовки блоков ответа ассистента).
 */

/** Имена блоков в формате «Имя: …». */
/** `Комментарий_перевод` перед `Комментарий`, иначе регекс съест префикс. */
export const TRANSLATION_PROTOCOL_BLOCK_NAMES =
  'Комментарий_перевод|Комментарий|Ошибки|Время|Конструкция|Формы|Повтори_перевод|Повтори|Repeat|Say'

/** Строка начинается с заголовка протокольного блока перевода. */
export const TRANSLATION_PROTOCOL_BLOCK_LINE = new RegExp(
  `^\\s*(?:\\d+\\)\\s*)?(?:${TRANSLATION_PROTOCOL_BLOCK_NAMES})\\s*:`,
  'i'
)

/** Модель иногда вставляет «Повтори:» сразу после «Повтори_перевод:» — убираем лишние ведущие префиксы. */
export function stripLeadingRepeatRuPrompt(body: string): string {
  let s = body.trim()
  while (/^Повтори\s*:\s*/i.test(s)) {
    s = s.replace(/^Повтори\s*:\s*/i, '').trim()
  }
  return s
}
