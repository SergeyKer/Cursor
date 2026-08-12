import type {
  LessonFooterSheetAudience,
  LessonFooterSheetMoment,
} from '@/lib/lessonFooterSheet/types'

export const LESSON_FOOTER_SHEET_TITLE = 'Подробнее'

const NOW_TITLE = {
  adult: 'Сейчас',
  child: 'Сейчас',
} as const

const STATUS_TITLE = {
  adult: 'Статус',
  child: 'Статус',
} as const

type MomentCopy = {
  nowMarker: string
  statusMarker: string
  nowFallback: { adult: string; child: string }
  statusFallback: { adult: string; child: string }
}

const MOMENT_COPY: Record<LessonFooterSheetMoment, MomentCopy> = {
  lessons_menu: {
    nowMarker: '📚',
    statusMarker: '⭐',
    nowFallback: {
      adult: 'Здесь темы уроков: коротко разберёшь смысл, пройдёшь шаги и получишь медаль. Выбери тему и начни.',
      child: 'Тут уроки: сначала смысл, потом шаги и медаль. Выбери тему и начинай!',
    },
    statusFallback: {
      adult: 'Звёзды, серия дней и монеты — твой общий прогресс. Они копятся по мере занятий.',
      child: 'Звёзды, серия и монеты — твои награды. Они растут, когда занимаешься.',
    },
  },
  intro: {
    nowMarker: '💡',
    statusMarker: '📋',
    nowFallback: {
      adult: 'Коротко разберём смысл темы. После этого можно перейти к фишкам или к уроку.',
      child: 'Сначала посмотрим, о чём тема. Потом — фишки или сам урок.',
    },
    statusFallback: {
      adult: 'Введение · дальше 7 шагов. В конце — медаль за результат.',
      child: 'Введение · потом 7 шагов и медаль!',
    },
  },
  tips: {
    nowMarker: '✨',
    statusMarker: '📋',
    nowFallback: {
      adult: 'Живые нюансы темы: смотри карточки и примеры. Это помогает перед шагами урока.',
      child: 'Фишки темы: смотри карточки. Так проще потом в уроке.',
    },
    statusFallback: {
      adult: 'Дополнительные фишки · ещё до основных шагов урока.',
      child: 'Фишки · потом будут шаги урока.',
    },
  },
  briefing: {
    nowMarker: '🎯',
    statusMarker: '📋',
    nowFallback: {
      adult: 'Перед шагами: цель прохода — сильный результат, медаль и при золоте монета (если ещё не получена).',
      child: 'Перед игрой: старайся на золото — будет медаль и может монета!',
    },
    statusFallback: {
      adult: 'Брифинг · 0/7 шагов впереди.',
      child: 'Брифинг · впереди 7 шагов.',
    },
  },
  lesson_idle: {
    nowMarker: '✍️',
    statusMarker: '📊',
    nowFallback: {
      adult: 'Ответь на шаг ниже. Футер показывает живой прогресс урока.',
      child: 'Ответь на шаг. Внизу видно, как идёшь по уроку.',
    },
    statusFallback: {
      adult: 'Цель шага, XP, combo и медаль — что уже набрано в этом проходе.',
      child: 'Цель, XP, combo и медаль — твой счёт в этом уроке.',
    },
  },
  lesson_checking: {
    nowMarker: '⏳',
    statusMarker: '📊',
    nowFallback: {
      adult: 'Проверяю ответ…',
      child: 'Проверяю…',
    },
    statusFallback: {
      adult: 'Цифры урока пока без новой награды — ждём результат проверки.',
      child: 'Подожди результат — цифры пока как есть.',
    },
  },
  lesson_error: {
    nowMarker: '💛',
    statusMarker: '📊',
    nowFallback: {
      adult: 'Ошибка — нормально. Посмотри подсказку и попробуй ещё раз. Урок из‑за одной ошибки не сгорает.',
      child: 'Ошибочка бывает! Смотри подсказку и попробуй снова.',
    },
    statusFallback: {
      adult: 'Прогресс урока сохранён. Можно исправить ответ или взять помощь за монету, если она есть на экране.',
      child: 'Прогресс на месте. Можно поправить ответ.',
    },
  },
  lesson_success: {
    nowMarker: '✅',
    statusMarker: '📊',
    nowFallback: {
      adult: 'Верно. Если есть начисление — оно уже в верхней строке футера.',
      child: 'Верно! Смотри награду вверху футера.',
    },
    statusFallback: {
      adult: 'Обновлённый счёт урока: XP, combo, медаль.',
      child: 'Счёт обновился: XP, combo, медаль.',
    },
  },
  finale: {
    nowMarker: '🏆',
    statusMarker: '🎁',
    nowFallback: {
      adult: 'Урок завершён. Здесь итог: медаль и награда за проход.',
      child: 'Урок готов! Смотри медаль и награду.',
    },
    statusFallback: {
      adult: 'Медаль и монета (если заработана / уже была раньше) — итог этого прохода.',
      child: 'Медаль и монета — твой итог!',
    },
  },
  reference: {
    nowMarker: '📖',
    statusMarker: '📋',
    nowFallback: {
      adult: 'Справочник открыт из урока: можно уточнить правило и вернуться к шагам.',
      child: 'Справочник из урока: подсмотри и возвращайся к шагам.',
    },
    statusFallback: {
      adult: 'Тема урока · режим справочника.',
      child: 'Тема урока · справочник.',
    },
  },
}

export function lessonFooterSheetNowTitle(audience: LessonFooterSheetAudience): string {
  return NOW_TITLE[audience]
}

export function lessonFooterSheetStatusTitle(audience: LessonFooterSheetAudience): string {
  return STATUS_TITLE[audience]
}

export function lessonFooterSheetMomentCopy(moment: LessonFooterSheetMoment): MomentCopy {
  return MOMENT_COPY[moment]
}

export function pickAudienceText(
  audience: LessonFooterSheetAudience,
  pair: { adult: string; child: string }
): string {
  return audience === 'child' ? pair.child : pair.adult
}
