export type PracticeCoinForgivenessCopy = {
  buttonLabel: string
  buttonAriaLabel: string
  confirmTitle: string
  confirmBody: (balanceAfter: number) => string
  zeroBalanceTitle: string
  zeroBalanceBody: string
  helpTitle: string
  helpMessage: string
  decline: string
  confirm: string
  appliedTitle: string
  appliedBody: (balanceAfter: number) => string
  appliedFooter: string
  continueLabel: string
  exhaustedLabel: string
  rollback: string
}

const COPY: PracticeCoinForgivenessCopy = {
  buttonLabel: '🪙 Не считать ошибку',
  buttonAriaLabel: 'Не учитывать эту ошибку за 1 монету',
  confirmTitle: 'Помощь за 1 монету',
  confirmBody: (balanceAfter) =>
    `Списать 1 монету? Останется ${balanceAfter}. Ошибка не помешает зачёту, но XP и COMBO не восстановятся.`,
  zeroBalanceTitle: 'Нет монет',
  zeroBalanceBody: 'Сейчас 0 монет. Чтобы не считать ошибку, нужна 1 монета.',
  helpTitle: 'Как получить монеты',
  helpMessage: 'Монеты: золото урока · 3-й и 5-й зачёт Челленджа.',
  decline: 'Не сейчас',
  confirm: 'Да, помочь',
  appliedTitle: 'Монета списана',
  appliedBody: (balanceAfter) => `Списали 1 🪙. Осталось: ${balanceAfter}.`,
  appliedFooter: 'Списали 1 монету. Ошибку не учитываем.',
  continueLabel: 'Продолжить',
  exhaustedLabel: 'Уже использовано',
  rollback: 'Монета возвращена. Попробуйте ещё раз.',
}

export function getPracticeCoinForgivenessCopy(): PracticeCoinForgivenessCopy {
  return COPY
}
