import type { PracticeSession } from '@/types/practice'

export type PracticeFooterState = 'idle' | 'checking' | 'feedback' | 'correction' | 'completed' | 'generating' | 'error'

export interface PracticeFooterView {
  dynamicText: string
  staticText: string
  typingKey: string
}

function modeLabel(mode: PracticeSession['mode']): string {
  if (mode === 'relaxed') return 'Relaxed'
  if (mode === 'balanced') return 'Balanced'
  return 'Challenge'
}

export function getPracticeFooterView(session: PracticeSession, state: PracticeFooterState): PracticeFooterView {
  const total = session.questions.length
  const current = Math.min(session.currentIndex + 1, Math.max(1, total))
  const staticText =
    state === 'completed'
      ? `Практика завершена | ${session.score}/${total} верно`
      : `Практика ${modeLabel(session.mode)} | ${current}/${total} | ${session.xp} XP | COMBO x${session.streak}`

  const dynamicText =
    state === 'checking'
      ? 'Смотрю ваш ответ.'
      : state === 'correction'
        ? 'Почти. Сейчас закрепим правильный вариант.'
        : state === 'completed'
          ? 'Практика завершена. Можно закрепить ещё сильнее.'
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
