/**
 * My Plan card styles — visual parity with Progress space (slate hat, inset CTA).
 * Intentional fork: do not import ProgressCard / APP_BTN_CARD_* from homeCtaStyles.
 */

import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'

const BTN_INTERACTION_BASE =
  'btn-3d-menu shadow-md transition-all duration-200 [@media(hover:hover)]:hover:shadow-lg touch-manipulation'

const BTN_DISABLED_CLASS = 'disabled:cursor-not-allowed disabled:opacity-60'

const BTN_FONT_INLINE =
  'text-[15px] font-medium leading-snug antialiased [font-family:system-ui,-apple-system,"Segoe_UI",Roboto,"Noto_Sans",Arial,sans-serif]'

const LAUNCH_SKIN =
  'border border-[#93c5fd] bg-gradient-to-b from-[#dbeafe] to-[#93c5fd] text-[#1e40af] [@media(hover:hover)]:hover:brightness-105 active:brightness-95'

/** Parity with CARD_EXPAND_SKIN — copy, do not import from homeCtaStyles. */
const EXPAND_SKIN =
  'border border-[#5eead4] bg-gradient-to-b from-[#ccfbf1] to-[#99f6e4] text-[#115e59] [@media(hover:hover)]:hover:brightness-105 active:brightness-95'

export const MY_PLAN_CARD_SURFACE = [
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)]',
  LESSON_CARD_RADIUS_CLASS,
  'overflow-hidden',
].join(' ')

export const MY_PLAN_CARD_HEADER = 'bg-[var(--chat-section-slate)] px-4 py-3'

export const MY_PLAN_CARD_HEADER_TITLE =
  'break-words text-[15px] font-semibold uppercase tracking-[0.02em] text-[var(--chat-label-main)]'

export const MY_PLAN_CARD_BODY =
  'space-y-1.5 border-t border-[var(--chat-section-card-divider)] bg-white px-4 py-2.5'

export const MY_PLAN_CARD_BODY_FLUSH =
  'border-t border-[var(--chat-section-card-divider)] bg-white p-0'

export const MY_PLAN_CARD_BODY_TITLE =
  'break-words text-[15px] font-semibold leading-[1.45] text-[var(--text)]'

export const MY_PLAN_CARD_BODY_REASON =
  'break-words text-[14px] leading-snug text-[var(--text-muted)]'

export const MY_PLAN_CARD_FOOTER_WRAP = 'bg-white px-2.5 pt-3 pb-2.5 sm:px-3'

const INSET_BTN = [
  BTN_INTERACTION_BASE,
  'flex w-full min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-center',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

export const MY_PLAN_CARD_FOOTER_LAUNCH = [INSET_BTN, LAUNCH_SKIN].join(' ')

export const MY_PLAN_CARD_FOOTER_EXPAND = [INSET_BTN, EXPAND_SKIN].join(' ')

export const MY_PLAN_CARD_FOOTER_ACTION = [
  INSET_BTN,
  'border border-[var(--border)] bg-white text-[var(--text)] [@media(hover:hover)]:hover:brightness-95 active:brightness-90',
].join(' ')

export const MY_PLAN_INSET_LAUNCH = [INSET_BTN, LAUNCH_SKIN, 'mt-3'].join(' ')

export const MY_PLAN_TUTOR_CHIP =
  'btn-3d-menu chat-section-surface glass-surface inline-flex min-w-0 min-h-8 cursor-pointer touch-manipulation items-center justify-center whitespace-normal rounded-[var(--bubble-radius-assistant,1rem)] border border-[var(--chat-section-neutral-border)] bg-white px-2 py-1 text-center text-[13px] font-semibold leading-tight text-[var(--text-muted)] [@media(hover:hover)]:hover:bg-slate-50 active:bg-slate-100'
