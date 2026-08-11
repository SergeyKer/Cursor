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
  /** @deprecated Prefer getLessonCoinForgivenessHelpLines() */
  zeroBalanceHelpMessage: string
  decline: string
  confirmYes: string
  processing: string
  appliedFooter: string
  appliedTitle: string
  appliedBody: (balanceAfter: number) => string
  appliedHowToGetCoins: string
  appliedContinue: string
  exhaustedLabel: string
  spendFailed: string
  rollback: string
}

const HOW_TO_GET_COINS_LINES = [
  'Монеты можно получить:',
  '— золотая медаль в уроке → 1 🪙',
  '— 3-й зачёт Челленджа → 1 🪙',
  '— 5-й зачёт Челленджа → 2 🪙',
  'Зачёты Челленджа — после золота по уроку.',
] as const

const HOW_TO_GET_COINS = HOW_TO_GET_COINS_LINES.join('\n')

const LESSON_COIN_FORGIVENESS_COPY: LessonCoinForgivenessCopy = {
  buttonLabel: '🪙 Не считать ошибку',
  buttonAriaLabel: 'Не учитывать эту ошибку за 1 монету',
  confirmTitle: 'Помощь за 1 монету',
  confirmBody: (balanceAfter) =>
    `Списать 1 монету? Останется ${balanceAfter}. Подставим правильный ответ и отправим. Серия COMBO не восстановится.`,
  confirmHintMuted:
    '«Не сейчас» - окно закроется, кнопка останется. Помощь - один раз за урок на любом задании.',
  confirmTitleZeroBalance: 'Нет монет',
  confirmBodyZeroBalance: 'Сейчас 0 монет. Чтобы не считать ошибку, нужна 1 монета.',
  confirmHintZeroBalance: 'Нажмите «Да, помочь» - подскажем, как заработать монеты.',
  zeroBalanceHelpTitle: 'Как получить монеты',
  zeroBalanceHelpMessage: HOW_TO_GET_COINS,
  decline: 'Не сейчас',
  confirmYes: 'Да, помочь',
  processing: 'Списываем 1 монету…',
  appliedFooter: 'Списали 1 монету. Ошибку не учитываем.',
  appliedTitle: 'Монета списана',
  appliedBody: (balanceAfter) => `Списали 1 🪙. Осталось: ${balanceAfter}.`,
  appliedHowToGetCoins: HOW_TO_GET_COINS,
  appliedContinue: 'Продолжить',
  exhaustedLabel: 'Уже использовано',
  spendFailed: 'Не удалось списать монету.',
  rollback: 'Монета возвращена. Попробуйте ещё раз.',
}

export function getLessonCoinForgivenessCopy(): LessonCoinForgivenessCopy {
  return LESSON_COIN_FORGIVENESS_COPY
}

export function getLessonCoinForgivenessHelpLines(): string[] {
  return [...HOW_TO_GET_COINS_LINES]
}
