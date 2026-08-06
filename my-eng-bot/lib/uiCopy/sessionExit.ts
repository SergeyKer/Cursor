/** Copy выхода из mid-cycle задания (урок / практика / chat-сессии). */

export const SESSION_EXIT_COPY = {
  buttonAriaLabel: 'Выйти из задания',
  buttonTitle: 'Выйти из задания',
  confirmTitle: 'Выйти из задания?',
  confirmBodyLesson: 'Прогресс этого прогона урока не сохранится.',
  confirmBodyPractice: 'Прогресс этого прогона практики не сохранится.',
  confirmBodyTranslation: 'Прогресс этого прогона перевода не сохранится.',
  confirmBodyDialogue: 'Прогресс этого прогона диалога не сохранится.',
  confirmBodyCommunication: 'Прогресс этого прогона общения не сохранится.',
  confirmBodyTutor: 'Прогресс этого закрепления не сохранится.',
  stay: 'Остаться',
  leave: 'Выйти',
  dialogAriaLabel: 'Подтверждение выхода из задания',
} as const

export type SessionExitKind =
  | 'lesson'
  | 'practice'
  | 'translation'
  | 'dialogue'
  | 'communication'
  | 'tutor'

const SESSION_EXIT_CONFIRM_BODY: Record<SessionExitKind, string> = {
  lesson: SESSION_EXIT_COPY.confirmBodyLesson,
  practice: SESSION_EXIT_COPY.confirmBodyPractice,
  translation: SESSION_EXIT_COPY.confirmBodyTranslation,
  dialogue: SESSION_EXIT_COPY.confirmBodyDialogue,
  communication: SESSION_EXIT_COPY.confirmBodyCommunication,
  tutor: SESSION_EXIT_COPY.confirmBodyTutor,
}

export function sessionExitConfirmBody(kind: SessionExitKind): string {
  return SESSION_EXIT_CONFIRM_BODY[kind]
}
