/** Фразы верхней строки футера диалога (≤ FOOTER_DYNAMIC_MAX_LENGTH = 38). */

export type DialogueFooterCopyAudience = 'adult' | 'child'

export const DIALOGUE_FOOTER_TOP = {
  idle: {
    adult: '8 ответов до цели сессии.',
    child: '8 ответов до цели. Погнали!',
  },
  idle_mid: {
    adult: 'Ещё {r} до цели. {n}/8.',
    child: 'Ещё {r} до цели. {n}/8.',
  },
  checking: {
    adult: 'Слушаю ваш ответ.',
    child: 'Слушаю ваш ответ…',
  },
  error: {
    adult: 'Повторите эту реплику. {n}/8.',
    child: 'Повторите эту реплику. {n}/8.',
  },
  recovered: {
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

export function formatDialogueFooterTop(
  template: string,
  vars: { n?: number; xp?: number; r?: number }
): string {
  return template
    .replaceAll('{n}', String(vars.n ?? 0))
    .replaceAll('{xp}', String(vars.xp ?? 0))
    .replaceAll('{r}', String(vars.r ?? 0))
}
