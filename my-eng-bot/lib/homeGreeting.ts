/** Полный текст приветствия: привет, факт из ротации, призыв. */
export function buildFullGreeting(factLine: string): string {
  return ['Hello! My name is MyEng.', factLine, 'Давай скорее общаться!'].join('\n\n')
}

/** Компактный режим после первого ухода из корня меню. */
export function buildCompactGreeting(): string {
  return ['Hello! My name is MyEng.', 'Давай скорее общаться!'].join('\n\n')
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
