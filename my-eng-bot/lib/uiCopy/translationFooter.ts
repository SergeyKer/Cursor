/** Фразы верхней строки футера перевода (≤ FOOTER_DYNAMIC_MAX_LENGTH = 38). */

export type TranslationFooterCopyAudience = 'adult' | 'child'

export const TRANSLATION_FOOTER_TOP = {
  idle: {
    adult: '8 предложений до цели сессии.',
    child: '8 предложений до цели. Погнали!',
  },
  checking: {
    adult: 'Проверяю формулировку.',
    child: 'Проверяю формулировку…',
  },
  error: {
    adult: 'Ещё раз это предложение. {n}/8.',
    child: 'Ещё раз это предложение. {n}/8.',
  },
  soft_fail: {
    adult: 'Идём дальше. {n}/8 · +1.',
    child: 'Идём дальше. {n}/8 · +1.',
  },
  success: {
    adult: 'Верно. {n}/8 · +4.',
    child: 'Верно! {n}/8 · +4.',
  },
  complete: {
    adult: 'Цель 8/8. +{xp} к уровню.',
    child: 'Цель 8/8! +{xp} к уровню!',
  },
  post_complete: {
    adult: 'Можно продолжать — XP уже начислен.',
    child: 'Можно дальше — XP уже начислен.',
  },
  daily_cap: {
    adult: 'Лимит перевода на сегодня: 40.',
    child: 'Лимит перевода на сегодня: 40.',
  },
} as const

export const TRANSLATION_FOOTER_STATUS = {
  goal: { adult: 'цель', child: 'цель' },
  active: { adult: 'в работе', child: 'в работе' },
  done: { adult: 'готово', child: 'готово' },
  capped: { adult: 'лимит', child: 'лимит' },
} as const

export function formatTranslationFooterTop(
  template: string,
  vars: { n?: number; xp?: number }
): string {
  return template
    .replaceAll('{n}', String(vars.n ?? 0))
    .replaceAll('{xp}', String(vars.xp ?? 0))
}
