const HOME_GREETING_INVITE_LINE =
  'Давай скорее общаться! Выбери, кто ты - ребёнок или взрослый.'

const HOME_GREETING_HUB_INVITE_LINE = 'Выбери: Уроки или Практика.'

/** Приветствие на главной: имя Engvo и призыв выбрать аудиторию (без фактов из ротации). */
export function buildCompactGreeting(options?: { audienceChosen?: boolean }): string {
  const invite = options?.audienceChosen ? HOME_GREETING_HUB_INVITE_LINE : HOME_GREETING_INVITE_LINE
  return ['Hello! My name is Engvo AI.', invite].join('\n\n')
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
