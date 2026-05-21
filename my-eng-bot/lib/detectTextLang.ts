/** Грубое определение доминирующего алфавита (для prefetch перевода EN-пузырей). */
export function detectTextLang(text: string): 'ru' | 'en' {
  const cyrCount = (text.match(/[А-Яа-яЁё]/g) ?? []).length
  const latCount = (text.match(/[A-Za-z]/g) ?? []).length
  return latCount > cyrCount ? 'en' : 'ru'
}
