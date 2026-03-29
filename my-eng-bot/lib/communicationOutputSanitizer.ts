import type { DetectedLang } from '@/lib/detectLang'

export function normalizeCommunicationOutput(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
    .filter((line) => !/^\s*(RU|Russian|Перевод)\s*:?/i.test(line.trim()))
    .filter((line) => !/^\s*(Комментарий|Повтори|Время|Конструкция)\s*:/i.test(line.trim()))
    .filter((line) => !/^\s*(Repeat|Say)\s*:/i.test(line.trim()))
    .join('\n')
    .trim()
}

export function collapseDuplicateLeadingGreetings(text: string, lang: DetectedLang): string {
  if (!text) return text
  if (lang === 'ru') {
    return text.replace(
      /^\s*((?:Привет|Здравствуй|Здраствуй|Здравствуйте|Добрый\s+день|Приветик|Хай)\b[!,.?\s]*)(?:(?:Привет|Здравствуй|Здраствуй|Здравствуйте|Добрый\s+день|Приветик|Хай)\b[!,.?\s]*)+/i,
      '$1'
    )
  }
  return text.replace(
    /^\s*((?:Hi|Hello|Hey|Greetings)\b[!,.?\s]*)(?:(?:Hi|Hello|Hey|Greetings)\b[!,.?\s]*)+/i,
    '$1'
  )
}

export function stripLeadingConversationFillers(text: string): string {
  if (!text) return text
  const leadingFillers = /^\s*(?:(?:Хорошо|Ладно|Окей|Ну\s+что|Итак|Okay|Ok|Well|So|Alright)\b[\s,!.?:;-]*)+/i
  return text.replace(leadingFillers, '').replace(/^\s+/, '').trim()
}

export function stripPostGreetingFillers(text: string, lang: DetectedLang): string {
  if (!text) return text
  if (lang === 'ru') {
    return text
      .replace(
        /^(\s*(?:Привет|Здравствуй|Здраствуй|Здравствуйте|Добрый\s+день|Приветик|Хай)\b[!,.?\s]*)\s*(?:(?:Хорошо|Ладно|Окей|Ну\s+что|Итак)\b[\s,!.?:;-]*)+/i,
        '$1'
      )
      .trim()
  }
  return text
    .replace(
      /^(\s*(?:Hi|Hello|Hey|Greetings)\b[!,.?\s]*)\s*(?:(?:Okay|Ok|Well|So|Alright)\b[\s,!.?:;-]*)+/i,
      '$1'
    )
    .trim()
}
