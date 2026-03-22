export type DetectedLang = 'ru' | 'en'

export function detectLangFromText(text: string, tieBreak: DetectedLang = 'ru'): DetectedLang {
  const cyrCount = (text.match(/[А-Яа-яЁё]/g) ?? []).length
  const latCount = (text.match(/[A-Za-z]/g) ?? []).length
  const cyrWordCount = (text.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g) ?? []).length
  const latWordCount = (text.match(/[A-Za-z]+(?:-[A-Za-z]+)*/g) ?? []).length

  // Смешанный ввод (RU + brand names на латинице):
  // "цена Bentley Continental" должен считаться русским.
  if (cyrWordCount > 0 && latWordCount > 0) {
    if (cyrWordCount >= latWordCount) return 'ru'
    if (latWordCount >= cyrWordCount + 2 && latCount > cyrCount * 2) return 'en'
    return 'ru'
  }

  if (cyrCount > latCount) return 'ru'
  if (latCount > cyrCount) return 'en'
  return tieBreak
}
