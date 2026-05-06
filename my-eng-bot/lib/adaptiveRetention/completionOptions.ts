import type { CompletionContext, CompletionOption } from '@/types/adaptiveRetention'

function option(params: CompletionOption): CompletionOption {
  return params
}

export function buildCompletionOptions(context: CompletionContext): CompletionOption[] {
  const options: CompletionOption[] = []
  const friendlyFinishTitle = context.audience === 'child' ? 'Закончить на сегодня' : 'Завершить сессию'

  if (context.hadErrors) {
    options.push(option({
      id: 'fix-errors',
      title: 'Закрепить ошибки',
      description: 'Коротко повторить только то, что сейчас выпало.',
      kind: 'weak_spot',
      target: { kind: 'practice', customTopic: context.title },
      primary: true,
    }))
  } else if (context.activeGoalTitle) {
    options.push(option({
      id: 'continue-goal',
      title: 'Продолжить цель',
      description: `Ещё один маленький шаг по теме «${context.activeGoalTitle}».`,
      kind: 'topic_pack',
      target: { kind: 'topic_pack', packId: 'current' },
      primary: true,
    }))
  } else {
    options.push(option({
      id: 'next-small-step',
      title: 'Ещё 2 минуты',
      description: 'Взять короткое задание без перегруза.',
      kind: 'practice',
      target: { kind: 'practice' },
      primary: true,
    }))
  }

  if (context.hasDueWords) {
    options.push(option({
      id: 'review-due',
      title: 'Повторить слова',
      description: 'Закрыть слова, которые пора вспомнить по SRS.',
      kind: 'srs_review',
      target: { kind: 'vocabulary' },
    }))
  }

  if ((context.sessionMinutes ?? 0) >= 10) {
    options.push(option({
      id: 'finish-positive',
      title: friendlyFinishTitle,
      description: 'Прогресс сохранён, продолжить можно позже.',
      kind: 'finish_today',
      target: { kind: 'daily_hub' },
    }))
  } else {
    options.push(option({
      id: 'daily-hub',
      title: 'Вернуться в мой путь',
      description: 'Посмотреть следующий лучший шаг.',
      kind: 'quick_start',
      target: { kind: 'daily_hub' },
    }))
  }

  return options.slice(0, 3)
}
