const HOME_GREETING_INVITE_LINE =
  'Давай скорее общаться! Выбери, кто ты - ребёнок или взрослый.'

/** Приветствие на главной: имя Engvo и призыв выбрать аудиторию (без фактов из ротации). */
export function buildCompactGreeting(): string {
  return ['Hello! My name is Engvo AI.', HOME_GREETING_INVITE_LINE].join('\n\n')
}

/** Блоки приветствия разделяются двойным переводом строки (имя, приглашение). */
export function splitGreetingIntoBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []
  return normalized
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}
