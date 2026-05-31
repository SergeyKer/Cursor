/** Полный текст приветствия: привет, факт из ротации, призыв. */
const HOME_GREETING_INVITE_LINE =
  'Давай скорее общаться! Выбери, кто ты — ребёнок или взрослый.'

export function buildFullGreeting(factLine: string): string {
  return ['Hello! My name is Engvo.AI.', factLine, HOME_GREETING_INVITE_LINE].join('\n\n')
}

/** Компактный режим после первого ухода из корня меню. */
export function buildCompactGreeting(): string {
  return ['Hello! My name is Engvo.AI.', HOME_GREETING_INVITE_LINE].join('\n\n')
}

/**
 * Три логических блока полного приветствия разделяются двойным переводом строки:
 * приветствие, факт, приглашение. В компактном режиме — два блока (имя, приглашение).
 */
export function splitGreetingIntoBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []
  return normalized
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}
