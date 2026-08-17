const HOME_GREETING_INVITE_LINE =
  'Давай скорее общаться! Выбери, кто ты - ребёнок или взрослый.'

const HOME_GREETING_HUB_INVITE_LINE_CHILD = 'Нажми «Играть» — начнём урок.'
const HOME_GREETING_HUB_INVITE_LINE_ADULT = 'Нажми «Начать» — продолжим с того места, где остановились.'

/** Приветствие на главной: имя Engvo и призыв (без фактов из ротации). */
export function buildCompactGreeting(options?: {
  audienceChosen?: boolean
  audience?: 'child' | 'adult'
}): string {
  const invite = options?.audienceChosen
    ? options.audience === 'child'
      ? HOME_GREETING_HUB_INVITE_LINE_CHILD
      : HOME_GREETING_HUB_INVITE_LINE_ADULT
    : HOME_GREETING_INVITE_LINE
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
