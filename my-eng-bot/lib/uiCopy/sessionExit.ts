/** Copy выхода из mid-cycle задания (урок / практика). */

export const SESSION_EXIT_COPY = {
  buttonAriaLabel: 'Выйти из задания',
  buttonTitle: 'Выйти из задания',
  confirmTitle: 'Выйти из задания?',
  confirmBodyLesson: 'Прогресс этого прогона урока не сохранится.',
  confirmBodyPractice: 'Прогресс этого прогона практики не сохранится.',
  stay: 'Остаться',
  leave: 'Выйти',
  dialogAriaLabel: 'Подтверждение выхода из задания',
} as const

export type SessionExitKind = 'lesson' | 'practice'

export function sessionExitConfirmBody(kind: SessionExitKind): string {
  return kind === 'practice'
    ? SESSION_EXIT_COPY.confirmBodyPractice
    : SESSION_EXIT_COPY.confirmBodyLesson
}
