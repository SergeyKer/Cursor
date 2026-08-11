/** Фразы верхней строки футера Репетитора (≤ FOOTER_DYNAMIC_MAX_LENGTH = 38). */

export type TutorFooterCopyAudience = 'adult' | 'child'

export const TUTOR_FOOTER_TOP = {
  idle: {
    adult: 'Спросите правило, слово или фразу.',
    child: 'Спроси правило, слово или фразу.',
  },
  triage: {
    adult: 'Уточните, с чего начать разбор.',
    child: 'Уточни, с чего начать разбор.',
  },
  busy_explain: {
    adult: 'Готовлю ответ…',
    child: 'Готовлю ответ…',
  },
  post_explain: {
    adult: 'Закрепите 2 мин — +6 XP.',
    child: 'Закрепи 2 мин — +6 XP.',
  },
  /** After Explain when micro chip is not offered (weak answerKind). */
  post_explain_soft: {
    adult: 'Уточните или попросите примеры.',
    child: 'Уточни или попроси примеры.',
  },
  micro_loading: {
    adult: 'Готовлю проверку…',
    child: 'Готовлю проверку…',
  },
  micro_revealing: {
    adult: 'Короткая проверка — сейчас вопрос.',
    child: 'Короткая проверка — сейчас вопрос.',
  },
  micro_active: {
    adult: 'Выберите ответ. {n}/{total}.',
    child: 'Выбери ответ. {n}/{total}.',
  },
  micro_finale: {
    adult: 'Проверка завершена. {n}/{total}.',
    child: 'Проверка завершена. {n}/{total}.',
  },
} as const

export function formatTutorFooterTop(
  template: string,
  vars: { n?: number; total?: number }
): string {
  return template
    .replaceAll('{n}', String(vars.n ?? 0))
    .replaceAll('{total}', String(vars.total ?? 0))
}
