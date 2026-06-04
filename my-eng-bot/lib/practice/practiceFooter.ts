import type { PracticeSession } from '@/types/practice'

export type PracticeFooterState =
  | 'briefing'
  | 'idle'
  | 'checking'
  | 'feedback'
  | 'correction'
  | 'generating'
  | 'generating_next'
  | 'completed'
  | 'error'

export interface PracticeFooterView {
  dynamicText: string
  staticText: string
  typingKey: string
}

function modeLabel(mode: PracticeSession['mode']): string {
  if (mode === 'reference') return 'Reference'
  if (mode === 'relaxed') return 'Relaxed'
  if (mode === 'balanced') return 'Balanced'
  return 'Challenge'
}

export function getPracticeFooterView(session: PracticeSession, state: PracticeFooterState): PracticeFooterView {
  const total = session.questions.length
  const current = Math.min(session.currentIndex + 1, Math.max(1, total))
  const staticText =
    state === 'briefing'
      ? `Практика ${modeLabel(session.mode)} | ${session.topic}`
      : state === 'completed'
        ? `Практика завершена | ${session.score}/${total} верно`
        : `Практика ${modeLabel(session.mode)} | ${current}/${total} | ${session.xp === 0 ? '0' : `+${session.xp}`} | COMBO x${session.streak}`

  const dynamicText =
    state === 'briefing'
      ? 'Прочитайте правила — затем к заданию.'
      : state === 'checking'
      ? 'Смотрю ваш ответ.'
      : state === 'feedback'
        ? 'Ответ принят. Можно идти дальше.'
      : state === 'generating_next'
        ? 'MyEng печатает следующий шаг.'
      : state === 'correction'
        ? 'Почти. Закрепим вариант.'
        : state === 'completed'
          ? 'Практика завершена. Закрепим ещё?'
          : state === 'generating'
            ? 'Готовлю новый вариант практики.'
            : state === 'error'
              ? 'Что-то пошло не так. Дадим безопасный вариант.'
              : session.streak >= 3
                ? `COMBO x${session.streak}. Отличный ритм.`
                : 'Следующее задание по этой же теме.'

  return {
    dynamicText,
    staticText,
    typingKey: `practice-${session.id}-${state}-${session.currentIndex}-${session.streak}`,
  }
}
