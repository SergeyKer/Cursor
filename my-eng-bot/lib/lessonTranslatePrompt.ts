const TRANSLATE_PROMPT_PREFIX = 'Переведите на английский:'

export { TRANSLATE_PROMPT_PREFIX }

/** Убирает хвостовую пунктуацию - фраза в кавычках без точки в конце. */
export function normalizeRuTranslatePhrase(text: string): string {
  return text.trim().replace(/[.!?…]+$/u, '')
}

/** Единый формат задания «переведите фразу»: русский текст в кавычках. */
export function formatTranslateQuestion(ruPhrase: string): string {
  const label = normalizeRuTranslatePhrase(ruPhrase)
  return `${TRANSLATE_PROMPT_PREFIX} "${label}"`
}
