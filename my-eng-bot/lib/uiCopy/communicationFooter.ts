/** Фразы верхней строки футера общения (≤ FOOTER_DYNAMIC_MAX_LENGTH = 38). */

export type CommunicationFooterCopyAudience = 'adult' | 'child'

export const COMMUNICATION_FOOTER_TOP = {
  idle: {
    adult: '8 обменов до цели сессии.',
    child: '8 обменов до цели. Погнали!',
  },
  checking: {
    adult: 'Слушаю вашу реплику.',
    child: 'Слушаю…',
  },
  success: {
    adult: 'Идём дальше. {n}/8 · +2 XP.',
    child: 'Дальше! {n}/8 · +2 XP.',
  },
  no_xp: {
    adult: 'Без XP — нужен английский кусок.',
    child: 'Без XP. Добавь слово на En.',
  },
  complete: {
    adult: 'Цель 8/8. +{xp} XP к уровню.',
    child: 'Цель 8/8! +{xp} XP к уровню!',
  },
  complete_zero: {
    adult: 'Цель 8/8. К уровню +0.',
    child: 'Цель 8/8. К уровню +0.',
  },
  post_complete: {
    adult: 'Можно продолжать — XP уже начислен.',
    child: 'Можно дальше — XP уже начислен.',
  },
  post_complete_zero: {
    adult: 'Цель закрыта. XP за En-попытку.',
    child: 'Цель есть. XP — за слово на En.',
  },
  daily_cap: {
    adult: 'XP дня набран. Можно общаться.',
    child: 'XP дня готов! Можно общаться!',
  },
} as const

export function formatCommunicationFooterTop(
  template: string,
  vars: { n?: number; xp?: number }
): string {
  return template
    .replaceAll('{n}', String(vars.n ?? 0))
    .replaceAll('{xp}', String(vars.xp ?? 0))
}
