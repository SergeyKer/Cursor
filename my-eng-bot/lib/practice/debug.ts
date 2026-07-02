/**
 * Показывать в карточке практики отладочные префиксы: шаг сессии и тип 1–12 (как #N в меню эталона).
 * `NEXT_PUBLIC_DEBUG_PRACTICE=1` - всегда вкл.; `=0` - всегда выкл.; не задано - только в development.
 */
function readPracticeDebugOverlay(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEBUG_PRACTICE
  if (flag === '1') return true
  if (flag === '0') return false
  return process.env.NODE_ENV === 'development'
}

export const showDebugQuestionIndex = readPracticeDebugOverlay()
