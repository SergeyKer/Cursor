/** Фразы верхней строки футера перевода (≤ FOOTER_DYNAMIC_MAX_LENGTH = 38). */

export type TranslationFooterCopyAudience = 'adult' | 'child'

export const TRANSLATION_FOOTER_TOP = {
  idle: {
    adult: '8 предложений до цели сессии.',
    child: '8 предложений до цели. Погнали!',
  },
  idle_mid: {
    adult: 'Ещё {r} до цели. {n}/8.',
    child: 'Ещё {r} до цели. {n}/8.',
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
    adult: 'Идём дальше. {n}/8.',
    child: 'Идём дальше. {n}/8.',
  },
  success: {
    adult: 'Верно. {n}/8.',
    child: 'Верно! {n}/8.',
  },
  complete: {
    adult: 'Цель 8/8. +{xp} XP к уровню.',
    child: 'Цель 8/8! +{xp} XP к уровню!',
  },
  post_complete: {
    adult: 'Можно продолжать — XP уже начислен.',
    child: 'Можно дальше — XP уже начислен.',
  },
} as const

/** @deprecated RIGHT meter uses glyphs; kept for any legacy callers. */
export const TRANSLATION_FOOTER_STATUS = {
  goal: { adult: 'цель', child: 'цель' },
  active: { adult: 'в работе', child: 'в работе' },
  done: { adult: 'готово', child: 'готово' },
  capped: { adult: 'лимит', child: 'лимит' },
} as const

export function formatTranslationFooterTop(
  template: string,
  vars: { n?: number; xp?: number; r?: number }
): string {
  return template
    .replaceAll('{n}', String(vars.n ?? 0))
    .replaceAll('{xp}', String(vars.xp ?? 0))
    .replaceAll('{r}', String(vars.r ?? 0))
}
