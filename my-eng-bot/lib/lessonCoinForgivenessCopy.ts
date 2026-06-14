export type LessonCoinForgivenessAudience = 'child' | 'adult'

export type LessonCoinForgivenessCopy = {
  buttonLabel: string
  buttonAriaLabel: string
  confirmTitle: string
  confirmBody: (balanceAfter: number) => string
  confirmHintMuted: string
  decline: string
  confirmYes: string
  processing: string
  appliedFooter: string
  exhaustedLabel: string
  spendFailed: string
  rollback: string
}

const ADULT_COPY: LessonCoinForgivenessCopy = {
  buttonLabel: '🪙 Не считать ошибку',
  buttonAriaLabel: 'Не учитывать эту ошибку за 1 монету',
  confirmTitle: 'Помощь за 1 монету',
  confirmBody: (balanceAfter) =>
    `Списать 1 монету? Останется ${balanceAfter}. Подставим правильный ответ и отправим. Серия COMBO не восстановится.`,
  confirmHintMuted: '«Не сейчас» — кнопка не появится снова в этом уроке',
  decline: 'Не сейчас',
  confirmYes: 'Да, помочь',
  processing: 'Списываем 1 монету…',
  appliedFooter: 'Списали 1 монету. Ошибку не учитываем.',
  exhaustedLabel: 'Уже использовано',
  spendFailed: 'Не удалось списать монету.',
  rollback: 'Монета возвращена. Попробуйте ещё раз.',
}

const CHILD_COPY: LessonCoinForgivenessCopy = {
  buttonLabel: '🪙 Помоги — 1 🪙',
  buttonAriaLabel: 'Помочь за 1 монету — подставим правильный ответ',
  confirmTitle: 'Помочь за 1 🪙?',
  confirmBody: (balanceAfter) =>
    `Останется ${balanceAfter}. Подставим правильный ответ.`,
  confirmHintMuted: 'Если откажешься, кнопка больше не появится в этом уроке',
  decline: 'Не сейчас',
  confirmYes: 'Да',
  processing: 'Списываем…',
  appliedFooter: 'Помогли за 1 🪙',
  exhaustedLabel: 'Уже помогли',
  spendFailed: 'Не удалось списать монету.',
  rollback: 'Монета вернулась.',
}

export function getLessonCoinForgivenessCopy(audience: LessonCoinForgivenessAudience): LessonCoinForgivenessCopy {
  return audience === 'child' ? CHILD_COPY : ADULT_COPY
}
