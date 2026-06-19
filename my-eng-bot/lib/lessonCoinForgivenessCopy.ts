export type LessonCoinForgivenessCopy = {
  buttonLabel: string
  buttonAriaLabel: string
  confirmTitle: string
  confirmBody: (balanceAfter: number) => string
  confirmHintMuted: string
  confirmTitleZeroBalance: string
  confirmBodyZeroBalance: string
  confirmHintZeroBalance: string
  zeroBalanceHelpTitle: string
  zeroBalanceHelpMessage: string
  decline: string
  confirmYes: string
  processing: string
  appliedFooter: string
  appliedTitle: string
  appliedBody: (balanceAfter: number) => string
  appliedCorrectAnswerPreview: (answer: string) => string
  appliedGoldMedalHint: string
  appliedContinue: string
  exhaustedLabel: string
  spendFailed: string
  rollback: string
}

const LESSON_COIN_FORGIVENESS_COPY: LessonCoinForgivenessCopy = {
  buttonLabel: '🪙 Не считать ошибку',
  buttonAriaLabel: 'Не учитывать эту ошибку за 1 монету',
  confirmTitle: 'Помощь за 1 монету',
  confirmBody: (balanceAfter) =>
    `Списать 1 монету? Останется ${balanceAfter}. Подставим правильный ответ и отправим. Серия COMBO не восстановится.`,
  confirmHintMuted:
    '«Не сейчас» — окно закроется, кнопка останется. Помощь — один раз за урок на любом задании.',
  confirmTitleZeroBalance: 'Нет монет',
  confirmBodyZeroBalance: 'Сейчас 0 монет. Чтобы не считать ошибку, нужна 1 монета.',
  confirmHintZeroBalance: 'Нажмите «Да, помочь» — подскажем, как заработать монеты.',
  zeroBalanceHelpTitle: 'Как получить монеты',
  zeroBalanceHelpMessage: 'Монеты можно заработать за золотые медали.',
  decline: 'Не сейчас',
  confirmYes: 'Да, помочь',
  processing: 'Списываем 1 монету…',
  appliedFooter: 'Списали 1 монету. Ошибку не учитываем.',
  appliedTitle: 'Монета списана',
  appliedBody: (balanceAfter) => `Списали 1 🪙. Осталось: ${balanceAfter}.`,
  appliedCorrectAnswerPreview: (answer) => `Правильный ответ: ${answer}`,
  appliedGoldMedalHint: 'Монеты можно заработать за золотые медали.',
  appliedContinue: 'Продолжить',
  exhaustedLabel: 'Уже использовано',
  spendFailed: 'Не удалось списать монету.',
  rollback: 'Монета возвращена. Попробуйте ещё раз.',
}

export function getLessonCoinForgivenessCopy(): LessonCoinForgivenessCopy {
  return LESSON_COIN_FORGIVENESS_COPY
}
